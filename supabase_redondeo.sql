-- =============================================================================
-- Redondeo de cantidades y montos.
--
-- Precio por kg x gramos deja fracciones de centavo: un pedido de 245 g de
-- mostaza totalizaba $1060.17625. Y el Excel del sistema de caja trae floats
-- como 0.14999999: con ese stock, pedir los últimos 150 g daba "stock
-- insuficiente". El importador ya redondea (stock a 3 decimales, precio a 2);
-- esto corrige place_order y los datos que ya estaban cargados.
--
-- Se puede correr más de una vez.
-- =============================================================================


-- 1. place_order: el total del pedido, a centavos. Igual que antes salvo esa línea.
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
        round(v_subtotal + v_delivery_fee, 2), 'Pendiente',
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


-- 2. Datos ya cargados: stock a gramos, precios y totales a centavos.
update public.products
set available_stock = round(available_stock, 3),
    reserved_stock  = round(reserved_stock, 3),
    price           = round(price, 2)
where available_stock <> round(available_stock, 3)
   or reserved_stock  <> round(reserved_stock, 3)
   or price           <> round(price, 2);

update public.orders
set total = round(total, 2)
where total <> round(total, 2);
