-- Cambiar columnas de stock y cantidad a tipo NUMERIC para soportar decimales
ALTER TABLE products 
  ALTER COLUMN available_stock TYPE NUMERIC,
  ALTER COLUMN reserved_stock TYPE NUMERIC,
  ADD COLUMN is_fractional BOOLEAN DEFAULT FALSE,
  ADD COLUMN fractional_step NUMERIC DEFAULT 1.0;

ALTER TABLE order_items
  ALTER COLUMN quantity TYPE NUMERIC;
