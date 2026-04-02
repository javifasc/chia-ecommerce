-- =============================================
-- FIX: Deshabilitar RLS para desarrollo rápido
-- =============================================
-- Supabase habilita RLS por defecto en las tablas nuevas.
-- Esto bloquea TODAS las lecturas/escrituras desde la Anon Key
-- (que es la que usa nuestra app) si no hay políticas definidas.
--
-- Opción A: DESHABILITAR RLS (rápido para desarrollo)

ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE promotions DISABLE ROW LEVEL SECURITY;

-- =============================================
-- (Alternativa para producción: crear políticas permisivas)
-- Descomentar si prefieres mantener RLS activo con acceso libre:
-- =============================================
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for products" ON products FOR ALL USING (true) WITH CHECK (true);
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for orders" ON orders FOR ALL USING (true) WITH CHECK (true);
-- ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
-- ALTER TABLE delivery_fees ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for delivery_fees" ON delivery_fees FOR ALL USING (true) WITH CHECK (true);
-- ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for promotions" ON promotions FOR ALL USING (true) WITH CHECK (true);
