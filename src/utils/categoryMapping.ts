export const CATEGORIES_MAP: Record<string, string[]> = {
    'Almacén Seco': ['HARINAS', 'FECULAS', 'PASTAS', 'LEGUMBRES', 'ARROZ', 'CONSERVAS', 'FRACCIONADOS', 'GENERAL'],
    'Desayuno & Merienda': ['CEREALES', 'GRANOLAS', 'GALLETITAS', 'BARRITAS', 'BUDINES', 'ALFAJORES'],
    'Chocolatería & Dulces': ['CHOCOLATES', 'BOMBONES', 'DULCES', 'MIELES'],
    'Bebidas Calientes': ['CAFES', 'TES', 'YERBAS', 'LECHES'],
    'Condimentos & Saborizantes': ['ESPECIAS', 'SALES', 'VINAGRES', 'ACEITES', 'ENDULZANTES'],
    'Salud & Bienestar': ['SUPLEMENTOS', 'ADAPTOGENOS'],
    'Snacks': ['SNACKS'],
    'Refrigerados': ['HELADERA', 'LECHES'],
    'Congelados': ['CONGELADOS'],
};

/**
 * Busca la categoría padre correspondiente a una subcategoría (familia).
 * Si no la encuentra, devuelve una por defecto.
 */
export function findParentCategory(subcategory: string): string {
    const sub = subcategory.toUpperCase().trim();
    for (const [parent, children] of Object.entries(CATEGORIES_MAP)) {
        if (children.includes(sub)) {
            return parent;
        }
    }
    return 'Almacén Seco'; // Default
}
