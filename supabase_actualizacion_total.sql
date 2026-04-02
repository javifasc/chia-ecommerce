-- SCRIPT DE ACTUALIZACIÓN TOTAL PARA #CHIA
-- Ejecuta este script en el SQL Editor de Supabase para sincronizar todas las mejoras de hoy y las anteriores.

-- 1. Soporte para Códigos (Software Fiscal)
ALTER TABLE products ADD COLUMN IF NOT EXISTS codigo TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_products_codigo ON products(codigo);

-- 2. Soporte para Stock Fraccional (Decimales)
-- Cambia los tipos de columna a NUMERIC para permitir decimales (p.ej. 0.500 kg)
ALTER TABLE products ALTER COLUMN available_stock TYPE NUMERIC;
ALTER TABLE products ALTER COLUMN reserved_stock TYPE NUMERIC;
ALTER TABLE order_items ALTER COLUMN quantity TYPE NUMERIC;

-- Agrega controles para productos por peso
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_fractional BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS fractional_step NUMERIC DEFAULT 1.0;

-- 3. Soporte para Novedades (Carrusel en Inicio)
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN DEFAULT FALSE;

-- 4. Notificación de éxito
-- El script se ha ejecutado correctamente si no hay errores arriba.
