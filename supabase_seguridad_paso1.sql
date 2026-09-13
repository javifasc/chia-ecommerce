-- ============================================================================
--  #CHIA - Seguridad - PASO 1 de 2: rol de admin y funciones del servidor
-- ============================================================================
--  Reemplaza a supabase_rls_fix.sql, que deshabilitaba RLS "para desarrollo
--  rápido" y dejaba products, orders, order_items, delivery_fees y promotions
--  abiertas a cualquiera con la anon key (que es pública: viaja dentro del JS
--  del sitio).
--
--  Este paso NO cambia ningún permiso todavía: solo agrega el rol y crea las
--  funciones. Se puede correr con la tienda andando, no rompe nada.
--
--  ORDEN:  1) correr este archivo   2) designar admin (al final)
--          3) desplegar el código   4) correr supabase_seguridad_paso2.sql
--
--  Es idempotente: se puede correr más de una vez.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Rol de administrador
-- ----------------------------------------------------------------------------

alter table public.profiles
    add column if not exists role text not null default 'customer';

alter table public.profiles
    drop constraint if exists profiles_role_check;
alter table public.profiles
    add constraint profiles_role_check check (role in ('customer', 'admin'));

-- Las políticas de abajo necesitan saber si el usuario actual es admin, y eso
-- implica leer profiles. Si lo hicieran con un select común, la política de
-- profiles se llamaría a sí misma (recursión infinita). SECURITY DEFINER hace
-- que la función corra como dueña de la tabla y se saltee RLS, cortando el ciclo.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
    );
$fn$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 2. Que nadie se pueda auto-ascender a admin
-- ----------------------------------------------------------------------------
-- updateProfile() manda un objeto libre al update de profiles. Sin esto, un
-- cliente podría mandar {"role": "admin"} y quedar de administrador.
-- El permiso se otorga por columna, así que 'role' queda fuera de su alcance.

revoke update on public.profiles from anon, authenticated;
grant update (full_name, email, phone, address, city, avatar_url)
    on public.profiles to authenticated;


-- ----------------------------------------------------------------------------
-- 3. Crear pedidos: función del servidor
-- ----------------------------------------------------------------------------
-- Hasta ahora el navegador insertaba el pedido y después descontaba el stock a
-- mano, mandando él mismo los precios. Eso obliga a dejar products escribible
-- por cualquiera, y además permite comprar a precio $0 editando el JS.
--
-- Acá se hace todo del lado del servidor, en una sola transacción:
--   - los precios y el costo de envío salen de la base, no del navegador
--   - se verifica que haya stock antes de confirmar
--   - se bloquean las filas (for update) para que dos compras simultáneas del
--     último artículo no pasen las dos
--
-- Sigue permitiendo comprar sin estar logueado, igual que hoy.

create sequence if not exists public.order_number_seq start with 1000;

create or replace function public.place_order(
    p_customer_name   text,
    p_customer_phone  text,
    p_delivery_method text,
    p_delivery_zone   text,
    p_address         text,
    p_items           jsonb   -- [{"product_id": "uuid", "quantity": 1.5}, ...]
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
    v_order_id        text;
    v_item            jsonb;
    v_product         public.products%rowtype;
    v_qty             numeric;
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

    if p_delivery_method = 'Envío' and coalesce(trim(p_address), '') = '' then
        raise exception 'Falta la dirección de envío';
    end if;

    -- Número de pedido sin colisiones. El código anterior sorteaba 4 dígitos al
    -- azar sobre una clave primaria: con ~110 pedidos ya era más probable que no
    -- que dos se pisaran.
    loop
        v_order_id := '#ORD-' || lpad(nextval('public.order_number_seq')::text, 4, '0');
        exit when not exists (select 1 from public.orders where id = v_order_id);
    end loop;

    -- Primera pasada: validar stock y calcular el subtotal con precios de la base.
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

        if v_product.available_stock < v_qty then
            raise exception 'Stock insuficiente de "%": quedan %',
                v_product.name, v_product.available_stock;
        end if;

        v_subtotal := v_subtotal + (v_product.price * v_qty);
    end loop;

    -- Costo de envío: mismo criterio que la pantalla del carrito.
    if p_delivery_method = 'Envío' then
        select fee into v_free_threshold
        from public.delivery_fees where zone = '_FREE_THRESHOLD_';
        v_free_threshold := coalesce(v_free_threshold, 0);

        if p_delivery_zone = 'Rada Tilly'
           and v_free_threshold > 0
           and v_subtotal >= v_free_threshold then
            v_delivery_fee := 0;
        else
            select fee into v_delivery_fee
            from public.delivery_fees where zone = p_delivery_zone;
            v_delivery_fee := coalesce(v_delivery_fee, 0);
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
$fn$;

revoke all on function public.place_order(text, text, text, text, text, jsonb) from public;
grant execute on function public.place_order(text, text, text, text, text, jsonb)
    to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 4. Sugerencias: función del servidor
-- ----------------------------------------------------------------------------
-- Sumar una sugerencia repetida requiere un update. Para no dejar la tabla
-- escribible por cualquiera, el contador se incrementa acá adentro.

create or replace function public.submit_suggestion(p_text text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
    v_clean text := trim(coalesce(p_text, ''));
begin
    if v_clean = '' or length(v_clean) > 200 then
        raise exception 'Sugerencia inválida';
    end if;

    update public.product_suggestions
    set count = coalesce(count, 1) + 1
    where lower(text) = lower(v_clean);

    if not found then
        insert into public.product_suggestions (text, count, status)
        values (v_clean, 1, 'pending');
    end if;
end;
$fn$;

revoke all on function public.submit_suggestion(text) from public;
grant execute on function public.submit_suggestion(text) to anon, authenticated;


-- ============================================================================
-- 5.  DESIGNAR AL ADMINISTRADOR   <-- OBLIGATORIO ANTES DEL PASO 2
-- ============================================================================
-- Cambiá el email por el de TU cuenta y descomentá la línea.
-- Tiene que ser una cuenta ya registrada en la tienda.
--
-- Para ver las cuentas disponibles:
--     select email from auth.users order by created_at;

-- update public.profiles set role = 'admin' where email = 'PONE_TU_EMAIL_ACA';


-- ============================================================================
-- 6. Verificación
-- ============================================================================
-- Tiene que haber al menos un admin:
--     select email, role from public.profiles where role = 'admin';
--
-- Y las tres funciones tienen que existir:
--     select proname from pg_proc
--     where proname in ('is_admin', 'place_order', 'submit_suggestion');
--
-- Si ambas consultas dan bien: desplegá el código y recién ahí corré el paso 2.
