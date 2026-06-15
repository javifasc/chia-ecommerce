-- Agregar la columna 'user_id' a la tabla 'orders' para vincular compras con usuarios
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Crear un índice en la columna 'user_id' para optimizar búsquedas e historial de pedidos
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
