-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de PRODUCTOS
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    full_description TEXT,
    price NUMERIC NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    image TEXT,
    unit TEXT,
    available_stock INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0,
    badges TEXT[],
    nutritional_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de PEDIDOS
CREATE TABLE orders (
    id TEXT PRIMARY KEY, -- Usamos formato #ORD-XXXX
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    total NUMERIC NOT NULL,
    status TEXT DEFAULT 'Pendiente',
    delivery_method TEXT NOT NULL,
    delivery_zone TEXT,
    delivery_fee NUMERIC,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla de ÍTEMS DE PEDIDO
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    quantity INTEGER NOT NULL
);

-- 5. Tabla de COSTOS DE ENVÍO
CREATE TABLE delivery_fees (
    zone TEXT PRIMARY KEY,
    fee NUMERIC NOT NULL
);

-- 6. Tabla de PROMOCIONES
CREATE TABLE promotions (
    id TEXT PRIMARY KEY, -- 'hero' o 'featured'
    data JSONB NOT NULL
);

-- 7. (Opcional) Roles simples para Admin
-- Por ahora usaremos la Anon Key y habilitaremos RLS simple o desactivaremos RLS para desarrollo rápido.
-- RECOMENDACIÓN: Activar RLS y crear políticas antes de producción.

-- Insertar costos de envío iniciales
INSERT INTO delivery_fees (zone, fee) VALUES 
('Rada Tilly', 500),
('Zona Sur', 800),
('Zona Centro', 600),
('Zona Norte', 1000);

-- Insertar promociones iniciales
INSERT INTO promotions (id, data) VALUES 
('hero', '{"tag": "Novedad", "title": "Cosecha Fresca de Temporada", "description": "Obtén un 20% de descuento en orgánicos esta semana.", "image": "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1074&auto=format&fit=crop", "buttonText": "Comprar Ahora"}'),
('featured', '{"sectionTitle": "Ofertas Frescas", "itemTitle": "Paquete Detox", "itemDescription": "Incluye 5 jugos y 2 ensaladas", "itemImage": "https://images.unsplash.com/photo-1544306094-e2dca9f57142?q=80&w=600&auto=format&fit=crop", "price": 35.00, "oldPrice": 45.00}');
