-- ============================================================================
--  #CHIA - Seguridad - PASO 2 de 2: activar Row Level Security
-- ============================================================================
--  ⚠️  CORRER ESTE ARCHIVO RECIÉN DESPUÉS DE:
--        1) haber corrido supabase_seguridad_paso1.sql
--        2) haber designado al menos un admin
--        3) haber desplegado el código nuevo en Vercel
--
--  Este paso es el que efectivamente cierra la base. El código viejo (el que
--  insertaba pedidos y descontaba stock desde el navegador) deja de funcionar
--  acá, por eso va último.
--
--  Reemplaza a supabase_rls_fix.sql, que deshabilitaba RLS "para desarrollo
--  rápido" y dejaba products, orders, order_items, delivery_fees y promotions
--  abiertas a cualquiera con la anon key (que es pública: viaja en el JS).
--
--  Es idempotente: se puede correr más de una vez.
-- ============================================================================


-- Chequeo previo: sin un admin designado, nadie podría administrar la tienda.
do $guard$
begin
    if not exists (select 1 from public.profiles where role = 'admin') then
        raise exception
            'No hay ningún admin designado. Corré primero supabase_seguridad_paso1.sql y el update del paso 6.';
    end if;
end $guard$;


-- ----------------------------------------------------------------------------
-- Activar RLS y definir las políticas
-- ----------------------------------------------------------------------------

-- --- Catálogo y configuración: lectura libre, escritura solo admin ---
do $do$
declare t text;
begin
    foreach t in array array['products', 'delivery_fees', 'promotions']
    loop
        execute format('alter table public.%I enable row level security', t);
        execute format('drop policy if exists %I on public.%I', t || '_select_public', t);
        execute format('drop policy if exists %I on public.%I', t || '_write_admin', t);
        execute format('create policy %I on public.%I for select using (true)',
                       t || '_select_public', t);
        execute format(
            'create policy %I on public.%I for all using (public.is_admin()) with check (public.is_admin())',
            t || '_write_admin', t);
    end loop;
end $do$;

-- --- Pedidos: cada cliente ve los suyos, el admin ve todos ---
alter table public.orders enable row level security;

drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin"
    on public.orders for select
    using (public.is_admin() or (user_id is not null and user_id = auth.uid()));

drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin"
    on public.orders for update
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders_delete_admin" on public.orders;
create policy "orders_delete_admin"
    on public.orders for delete
    using (public.is_admin());

-- Sin política de insert a propósito: los pedidos entran solo por place_order().
revoke insert on public.orders from anon, authenticated;

alter table public.order_items enable row level security;

drop policy if exists "order_items_select_own_or_admin" on public.order_items;
create policy "order_items_select_own_or_admin"
    on public.order_items for select
    using (
        public.is_admin()
        or exists (
            select 1 from public.orders o
            where o.id = order_items.order_id
              and o.user_id is not null
              and o.user_id = auth.uid()
        )
    );

drop policy if exists "order_items_write_admin" on public.order_items;
create policy "order_items_write_admin"
    on public.order_items for all
    using (public.is_admin()) with check (public.is_admin());

revoke insert on public.order_items from anon, authenticated;

-- --- Sugerencias: se leen y se cargan libremente, se moderan solo desde admin ---
alter table public.product_suggestions enable row level security;

drop policy if exists "Cualquiera puede insertar sugerencias"   on public.product_suggestions;
drop policy if exists "Cualquiera puede leer sugerencias"       on public.product_suggestions;
drop policy if exists "Solo admin puede actualizar sugerencias" on public.product_suggestions;
drop policy if exists "Solo admin puede borrar sugerencias"     on public.product_suggestions;
drop policy if exists "suggestions_select_public" on public.product_suggestions;
drop policy if exists "suggestions_write_admin"   on public.product_suggestions;

create policy "suggestions_select_public"
    on public.product_suggestions for select using (true);
create policy "suggestions_write_admin"
    on public.product_suggestions for all
    using (public.is_admin()) with check (public.is_admin());

revoke insert on public.product_suggestions from anon, authenticated;


-- ============================================================================
-- Verificación
-- ============================================================================
-- Todas las tablas deben figurar con rowsecurity = true:
--     select tablename, rowsecurity from pg_tables where schemaname = 'public';
--
-- Y tiene que seguir habiendo al menos un admin:
--     select email, role from public.profiles where role = 'admin';
