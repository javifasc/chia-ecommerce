-- Importación de stock segura: todo o nada, con copia previa y "deshacer".
--
-- Antes el navegador hacía upsert de a 100 productos: si un lote fallaba la
-- importación quedaba a medias, y un Excel equivocado no tenía vuelta atrás.
-- Ahora import_stock hace todo en una sola transacción y guarda cómo estaba
-- cada producto; undo_last_import lo restaura.

create table if not exists public.import_backups (
    id           uuid primary key default gen_random_uuid(),
    created_at   timestamptz not null default now(),
    created_by   uuid default auth.uid(),
    -- Por producto actualizado: valores previos y el disponible que dejó la importación.
    -- [{id, name, price, category, subcategory, available_stock, imported_available}]
    snapshot     jsonb not null default '[]'::jsonb,
    created_ids  uuid[] not null default '{}',
    updated_count int not null default 0,
    created_count int not null default 0,
    undone_at    timestamptz
);

alter table public.import_backups enable row level security;

drop policy if exists import_backups_select_admin on public.import_backups;
create policy import_backups_select_admin on public.import_backups
    for select using (public.is_admin());
-- Sin políticas de escritura: solo las funciones de abajo (security definer) escriben.

-- p_rows: [{codigo, name, price, category, subcategory, stock}], sin códigos repetidos.
create or replace function public.import_stock(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_row        jsonb;
    v_codigo     text;
    v_name       text;
    v_price      numeric;
    v_stock      numeric;
    v_product    public.products%rowtype;
    v_new_avail  numeric;
    v_new_id     uuid;
    v_snapshot   jsonb := '[]'::jsonb;
    v_created    uuid[] := '{}';
    v_backup_id  uuid;
begin
    if not public.is_admin() then
        raise exception 'Solo el administrador puede importar stock';
    end if;

    if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
        raise exception 'El archivo no tiene productos para importar';
    end if;

    for v_row in select * from jsonb_array_elements(p_rows)
    loop
        v_codigo := trim(coalesce(v_row->>'codigo', ''));
        v_name   := trim(coalesce(v_row->>'name', ''));
        v_price  := round((v_row->>'price')::numeric, 2);
        v_stock  := round((v_row->>'stock')::numeric, 3);

        if v_codigo = '' then
            raise exception 'Hay una fila sin código';
        end if;
        if v_price is null or v_price < 0 or v_stock is null then
            raise exception 'Valores inválidos en el código %', v_codigo;
        end if;

        select * into v_product from public.products where codigo = v_codigo for update;

        if found then
            -- El Excel es el stock físico, que incluye lo reservado por pedidos web
            -- sin entregar. Un negativo del sistema de caja se toma como 0.
            v_new_avail := greatest(0, round(v_stock - coalesce(v_product.reserved_stock, 0), 3));

            v_snapshot := v_snapshot || jsonb_build_object(
                'id', v_product.id,
                'name', v_product.name,
                'price', v_product.price,
                'category', v_product.category,
                'subcategory', v_product.subcategory,
                'available_stock', v_product.available_stock,
                'imported_available', v_new_avail
            );

            update public.products set
                -- Nunca dejar un producto sin nombre.
                name            = case when v_name <> '' then v_name else name end,
                price           = v_price,
                category        = coalesce(nullif(v_row->>'category', ''), category),
                subcategory     = coalesce(nullif(v_row->>'subcategory', ''), subcategory),
                available_stock = v_new_avail
            where id = v_product.id;
        else
            if v_name = '' then
                raise exception 'El código % es nuevo y no tiene nombre', v_codigo;
            end if;

            insert into public.products (
                codigo, name, description, price, category, subcategory,
                image, unit, available_stock, reserved_stock
            ) values (
                v_codigo, v_name, v_name, v_price,
                coalesce(nullif(v_row->>'category', ''), 'General'),
                nullif(v_row->>'subcategory', ''),
                '', 'un.', greatest(0, v_stock), 0
            )
            returning id into v_new_id;

            v_created := v_created || v_new_id;
        end if;
    end loop;

    insert into public.import_backups (snapshot, created_ids, updated_count, created_count)
    values (v_snapshot, v_created, jsonb_array_length(v_snapshot), coalesce(array_length(v_created, 1), 0))
    returning id into v_backup_id;

    -- Alcanza con las últimas 10 copias.
    delete from public.import_backups
    where id not in (select id from public.import_backups order by created_at desc limit 10);

    return jsonb_build_object(
        'import_id', v_backup_id,
        'updated', jsonb_array_length(v_snapshot),
        'created', coalesce(array_length(v_created, 1), 0)
    );
end;
$$;

-- Deshace la última importación (solo la más reciente, y una sola vez).
-- El stock respeta lo que pasó después: si desde la importación entraron o se
-- cancelaron pedidos, ese movimiento se conserva sobre el valor anterior.
create or replace function public.undo_last_import()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_backup    public.import_backups%rowtype;
    v_item      jsonb;
    v_restored  int := 0;
    v_deleted   int := 0;
    v_hidden    int := 0;
    v_id        uuid;
begin
    if not public.is_admin() then
        raise exception 'Solo el administrador puede deshacer una importación';
    end if;

    select * into v_backup from public.import_backups
    order by created_at desc limit 1
    for update;

    if not found then
        raise exception 'No hay importaciones para deshacer';
    end if;
    if v_backup.undone_at is not null then
        raise exception 'La última importación ya se deshizo';
    end if;

    for v_item in select * from jsonb_array_elements(v_backup.snapshot)
    loop
        update public.products p set
            name            = v_item->>'name',
            price           = (v_item->>'price')::numeric,
            category        = v_item->>'category',
            subcategory     = v_item->>'subcategory',
            available_stock = greatest(0, round(
                (v_item->>'available_stock')::numeric
                + (p.available_stock - (v_item->>'imported_available')::numeric), 3))
        where p.id = (v_item->>'id')::uuid;

        if found then v_restored := v_restored + 1; end if;
    end loop;

    -- Productos que creó la importación: se borran, salvo que ya tengan pedidos;
    -- esos se ocultan dejándolos sin stock.
    foreach v_id in array v_backup.created_ids
    loop
        if exists (select 1 from public.order_items where product_id = v_id) then
            update public.products set available_stock = 0 where id = v_id;
            if found then v_hidden := v_hidden + 1; end if;
        else
            delete from public.products where id = v_id;
            if found then v_deleted := v_deleted + 1; end if;
        end if;
    end loop;

    update public.import_backups set undone_at = now() where id = v_backup.id;

    return jsonb_build_object('restored', v_restored, 'deleted', v_deleted, 'hidden', v_hidden);
end;
$$;

revoke all on function public.import_stock(jsonb) from public, anon;
revoke all on function public.undo_last_import() from public, anon;
grant execute on function public.import_stock(jsonb) to authenticated;
grant execute on function public.undo_last_import() to authenticated;
