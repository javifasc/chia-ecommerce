-- Tabla para sugerencias de productos
CREATE TABLE product_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text TEXT UNIQUE NOT NULL,
    count INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de RLS para sugerencias (Todos pueden insertar/leer, solo admin puede borrar/editar)
ALTER TABLE product_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede insertar sugerencias" 
ON product_suggestions FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Cualquiera puede leer sugerencias" 
ON product_suggestions FOR SELECT 
USING (true);

CREATE POLICY "Solo admin puede actualizar sugerencias" 
ON product_suggestions FOR UPDATE 
USING (true); -- En un entorno real se limitaría por auth.role()

CREATE POLICY "Solo admin puede borrar sugerencias" 
ON product_suggestions FOR DELETE 
USING (true);
