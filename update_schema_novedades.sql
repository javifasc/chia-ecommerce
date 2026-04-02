-- Agregar columna is_new_arrival a la tabla de productos
ALTER TABLE products ADD COLUMN is_new_arrival BOOLEAN DEFAULT FALSE;
