-- Agregar columna 'codigo' para vincular con software fiscal
ALTER TABLE products ADD COLUMN IF NOT EXISTS codigo TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_products_codigo ON products(codigo);
