-- =============================================================================
-- Stock según el estado del pedido, estado "Cancelado" y productos sin precio.
--
-- Hasta ahora la app liberaba el stock reservado a mano al marcar "Entregado"
-- (leer, restar, escribir desde el navegador). Marcarlo dos veces descontaba
-- dos veces, y no había forma de cancelar un pedido: su stock quedaba
-- reservado para siempre. Resultado: 43 productos con el reservado desfasado,
-- 24 de ellos negativo.
--
-- Ahora el stock lo mueve un trigger en la base, para cualquier cambio de
-- estado venga de donde venga. Cada estado define dónde está la mercadería:
--
--   Pendiente / Preparación / Listo  -> fuera del disponible, en el reservado
--   Entregado                        -> fuera del disponible, fuera del reservado
--   Cancelado                        -> de vuelta en el disponible
--
-- y el trigger aplica solo la diferencia entre el estado viejo y el nuevo, así
-- que repetir un estado no cambia nada.
--
-- Se puede correr más de una vez.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Estados válidos.
-- -----------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
    check (status in ('Pendiente', 'Preparación', 'Listo', 'Entregado', 'Cancelado'));


-- -----------------------------------------------------------------------------
-- 2. Mover stock al cambiar de estado.
-- -----------------------------------------------------------------------------
create or replace function public.apply_order_status_stock()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
    v_item          record;
    v_old_reserved  int := case when old.status in ('Pendiente', 'Preparación', 'Listo') then 1 else 0 end;
    v_new_reserved  int := case when new.status in ('Pendiente', 'Preparación', 'Listo') then 1 else 0 end;
    v_old_returned  int := case when old.status = 'Cancelado' then 1 else 0 end;
    v_new_returned  int := case when new.status = 'Cancelado' then 1 else 0 end;
    v_available     numeric;
begin
    for v_item in
        select product_id, quantity, name
        from public.order_items
        where order_id = new.id and product_id is not null
    loop
        -- Reactivar un pedido cancelado vuelve a tomar stock: tiene que haber.
        if v_old_returned > v_new_returned then
            select available_stock into v_available
            from public.products where id = v_item.product_id for update;

            if v_available < v_item.quantity then
                raise exception 'No hay stock para reactivar el pedido: de "%" quedan %',
                    v_item.name, v_available;
            end if;
        end if;

        update public.products
        set reserved_stock  = reserved_stock  + v_item.quantity * (v_new_reserved - v_old_reserved),
            available_stock = available_stock + v_item.quantity * (v_new_returned - v_old_returned)
        where id = v_item.product_id;
    end loop;

    return new;
end;
$function$;

drop trigger if exists orders_status_stock on public.orders;
create trigger orders_status_stock
    after update of status on public.orders
    for each row
    when (old.status is distinct from new.status)
    execute function public.apply_order_status_stock();


-- -----------------------------------------------------------------------------
-- 3. Borrar un pedido activo devuelve su stock, igual que cancelarlo.
--    BEFORE: los order_items todavía existen (se borran en cascada después).
-- -----------------------------------------------------------------------------
create or replace function public.release_deleted_order_stock()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
    if old.status in ('Pendiente', 'Preparación', 'Listo') then
        update public.products p
        set reserved_stock  = p.reserved_stock  - oi.quantity,
            available_stock = p.available_stock + oi.quantity
        from public.order_items oi
        where oi.order_id = old.id and oi.product_id = p.id;
    end if;
    return old;
end;
$function$;

drop trigger if exists orders_delete_stock on public.orders;
create trigger orders_delete_stock
    before delete on public.orders
    for each row
    execute function public.release_deleted_order_stock();

-- Funciones de trigger: no se llaman por /rest/v1/rpc.
revoke execute on function public.apply_order_status_stock() from public, anon, authenticated;
revoke execute on function public.release_deleted_order_stock() from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 4. place_order rechaza productos sin precio: con precio 0 se llevaban gratis.
-- -----------------------------------------------------------------------------
create or replace function public.place_order(
    p_customer_name text,
    p_customer_phone text,
    p_delivery_method text,
    p_delivery_zone text,
    p_address text,
    p_items jsonb
)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
    v_order_id        text;
    v_item            jsonb;
    v_product         public.products%rowtype;
    v_qty             numeric;
    v_grams           numeric;
    v_subtotal        numeric := 0;
    v_delivery_fee    numeric := 0;
    v_free_threshold  numeric := 0;
begin
    if coalesce(trim(p_customer_name), '') = '' or coalesce(trim(p_customer_phone), '') = '' then
        raise exception 'Faltan el nombre o el teléfono de contacto';
    end if;

    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'El carrito está vacío';
    end if;

    if p_delivery_method = 'Envío' then
        if coalesce(trim(p_address), '') = '' then
            raise exception 'Falta la dirección de envío';
        end if;

        -- Las filas que empiezan con '_' son configuración, no zonas.
        select fee into v_delivery_fee
        from public.delivery_fees
        where zone = p_delivery_zone and zone not like '\_%';

        if not found then
            raise exception 'Zona de envío inválida';
        end if;
    elsif p_delivery_method is distinct from 'Retiro' then
        raise exception 'Método de entrega inválido';
    end if;

    -- Número de pedido sin colisiones. El código anterior sorteaba 4 dígitos al
    -- azar sobre una clave primaria: con ~110 pedidos ya era más probable que no
    -- que dos se pisaran.
    loop
        v_order_id := '#ORD-' || lpad(nextval('public.order_number_seq')::text, 4, '0');
        exit when not exists (select 1 from public.orders where id = v_order_id);
    end loop;

    -- Primera pasada: validar cantidades, precio y stock, y calcular el
    -- subtotal con precios de la base.
    for v_item in select * from jsonb_array_elements(p_items)
    loop
        v_qty := (v_item->>'quantity')::numeric;

        if v_qty is null or v_qty <= 0 then
            raise exception 'Cantidad inválida en el pedido';
        end if;

        select * into v_product
        from public.products
        where id = (v_item->>'product_id')::uuid
        for update;

        if not found then
            raise exception 'Hay un producto del carrito que ya no existe';
        end if;

        if coalesce(v_product.price, 0) <= 0 then
            raise exception '"%" no está disponible por el momento', v_product.name;
        end if;

        if coalesce(v_product.is_fractional, false) then
            v_grams := v_qty * 1000;
            if v_grams <> trunc(v_grams)
               or (coalesce(v_product.fractional_step, 0) > 0
                   and mod(v_grams, v_product.fractional_step) <> 0) then
                raise exception 'Cantidad inválida de "%"', v_product.name;
            end if;
        elsif v_qty <> trunc(v_qty) then
            raise exception '"%" se vende por unidad', v_product.name;
        end if;

        if v_product.available_stock < v_qty then
            raise exception 'Stock insuficiente de "%": quedan %',
                v_product.name, v_product.available_stock;
        end if;

        v_subtotal := v_subtotal + (v_product.price * v_qty);
    end loop;

    -- Envío gratis: mismo criterio que la pantalla del carrito.
    if p_delivery_method = 'Envío' and p_delivery_zone = 'Rada Tilly' then
        select fee into v_free_threshold
        from public.delivery_fees where zone = '_FREE_THRESHOLD_';
        v_free_threshold := coalesce(v_free_threshold, 0);

        if v_free_threshold > 0 and v_subtotal >= v_free_threshold then
            v_delivery_fee := 0;
        end if;
    end if;

    insert into public.orders (
        id, customer_name, customer_phone, total, status,
        delivery_method, delivery_zone, delivery_fee, address, user_id
    ) values (
        v_order_id, trim(p_customer_name), trim(p_customer_phone),
        v_subtotal + v_delivery_fee, 'Pendiente',
        p_delivery_method,
        case when p_delivery_method = 'Envío' then p_delivery_zone end,
        v_delivery_fee,
        case when p_delivery_method = 'Envío' then p_address end,
        auth.uid()
    );

    -- Segunda pasada: ya está todo validado, registramos los ítems y movemos stock.
    for v_item in select * from jsonb_array_elements(p_items)
    loop
        v_qty := (v_item->>'quantity')::numeric;

        select * into v_product
        from public.products
        where id = (v_item->>'product_id')::uuid
        for update;

        insert into public.order_items (order_id, product_id, name, price, quantity)
        values (v_order_id, v_product.id, v_product.name, v_product.price, v_qty);

        update public.products
        set available_stock = available_stock - v_qty,
            reserved_stock  = reserved_stock + v_qty
        where id = v_product.id;
    end loop;

    return v_order_id;
end;
$function$;


-- -----------------------------------------------------------------------------
-- 5. Recalcular el reservado una vez: lo que suman los pedidos activos.
--    El disponible no se toca; lo corrige la importación del Excel de stock.
-- -----------------------------------------------------------------------------
update public.products p
set reserved_stock = coalesce(a.activo, 0)
from public.products p2
left join (
    select oi.product_id, sum(oi.quantity) as activo
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.status in ('Pendiente', 'Preparación', 'Listo')
    group by oi.product_id
) a on a.product_id = p2.id
where p.id = p2.id
  and p.reserved_stock is distinct from coalesce(a.activo, 0);
