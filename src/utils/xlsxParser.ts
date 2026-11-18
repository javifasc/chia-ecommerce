import * as XLSX from 'xlsx';

export type ParsedStockRow = {
    codigo: string;
    nombre: string;
    familia: string;
    stock: number;
    costoValorizado: number;
    ventaValorizada: number;
    deposito: string;
};

export type ParseResult = {
    rows: ParsedStockRow[];
    errors: string[];
    totalRows: number;
    /** Columnas obligatorias que no están en el archivo: si hay alguna, no se puede importar. */
    missingColumns: string[];
    /** Códigos que aparecían en más de una fila (p. ej. dos depósitos): se sumó el stock. */
    mergedCodes: string[];
};

const ALIASES = {
    codigo: ['Código', 'Codigo', 'codigo', 'CODIGO', 'Cod', 'Code'],
    nombre: ['Nombre', 'nombre', 'NOMBRE', 'Descripcion', 'Descripción', 'Name'],
    familia: ['Familia', 'familia', 'FAMILIA', 'Categoría', 'Categoria', 'Category'],
    deposito: ['Depósito', 'Deposito', 'deposito', 'DEPOSITO', 'Deposit'],
    stock: ['Stock', 'stock', 'STOCK', 'Cantidad', 'Qty'],
    costo: ['Costo Valorizado', 'Costo', 'costo', 'COSTO', 'Cost'],
    venta: ['Venta Valorizada', 'Venta', 'venta', 'VENTA', 'Precio', 'Price'],
};

// Sin estas columnas el valor faltante se leía como vacío o 0 y pisaba la tienda
// entera (todo sin stock, sin precio o sin nombre).
const REQUIRED: { label: string; aliases: string[] }[] = [
    { label: 'Código', aliases: ALIASES.codigo },
    { label: 'Nombre', aliases: ALIASES.nombre },
    { label: 'Stock', aliases: ALIASES.stock },
    { label: 'Venta Valorizada (precio)', aliases: ALIASES.venta },
];

/**
 * Parsea un archivo XLSX del software fiscal y extrae las filas relevantes.
 * Columnas esperadas: Depósito, Nombre, Código, Familia, Stock, Costo Valorizado, Venta Valorizada
 */
export function parseStockXLSX(file: File): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                const header = (XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })[0] || [])
                    .map(h => String(h).trim().toLowerCase());
                const missingColumns = REQUIRED
                    .filter(col => !col.aliases.some(a => header.includes(a.toLowerCase())))
                    .map(col => col.label);

                // Convert to JSON (header row becomes keys)
                const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

                const errors: string[] = [];
                const byCode = new Map<string, ParsedStockRow>();
                const mergedCodes = new Set<string>();

                rawRows.forEach((row, index) => {
                    // Try to find columns (flexible matching)
                    const codigo = String(findCol(row, ALIASES.codigo) || '').trim();
                    const nombre = String(findCol(row, ALIASES.nombre) || '').trim();
                    const familia = String(findCol(row, ALIASES.familia) || '').trim();
                    const deposito = String(findCol(row, ALIASES.deposito) || '').trim();
                    const stockRaw = findCol(row, ALIASES.stock);
                    const costoRaw = findCol(row, ALIASES.costo);
                    const ventaRaw = findCol(row, ALIASES.venta);

                    if (!codigo) {
                        errors.push(`Fila ${index + 2}: Sin código, se omite.`);
                        return;
                    }

                    const stock = parseNumber(stockRaw);
                    const costoValorizado = parseNumber(costoRaw);
                    const ventaValorizada = parseNumber(ventaRaw);

                    // Un código repetido (otro depósito) hacía fallar un lote entero de
                    // la importación: ahora se suma el stock y se avisa.
                    const previous = byCode.get(codigo);
                    if (previous) {
                        mergedCodes.add(codigo);
                        previous.stock += stock;
                        if (!previous.nombre) previous.nombre = nombre;
                        if (!previous.familia) previous.familia = familia;
                        if (!previous.ventaValorizada) previous.ventaValorizada = ventaValorizada;
                        return;
                    }

                    byCode.set(codigo, {
                        codigo,
                        nombre,
                        familia,
                        stock,
                        costoValorizado,
                        ventaValorizada,
                        deposito
                    });
                });

                resolve({
                    rows: [...byCode.values()],
                    errors,
                    totalRows: rawRows.length,
                    missingColumns,
                    mergedCodes: [...mergedCodes]
                });
            } catch (err) {
                reject(new Error('Error al leer el archivo XLSX. Verifica que sea un archivo válido.'));
            }
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo.'));
        reader.readAsArrayBuffer(file);
    });
}

/** 
 * Busca un valor en un objeto de fila probando múltiples nombres de columna posibles 
 */
function findCol(row: Record<string, any>, aliases: string[]): any {
    for (const alias of aliases) {
        if (row[alias] !== undefined && row[alias] !== '') {
            return row[alias];
        }
    }
    // Also try case-insensitive match on the keys
    const lowerAliases = aliases.map(a => a.toLowerCase());
    for (const key of Object.keys(row)) {
        if (lowerAliases.includes(key.toLowerCase())) {
            return row[key];
        }
    }
    return undefined;
}

/**
 * Parsea un valor numérico de manera flexible (maneja separadores de miles, decimales, etc.)
 */
function parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;

    // Remove whitespace and currency symbols
    let cleaned = String(value).trim().replace(/[$\s]/g, '');

    if (!cleaned) return 0;

    // Check if there are BOTH dots and commas
    const hasDot = cleaned.includes('.');
    const hasComma = cleaned.includes(',');

    if (hasDot && hasComma) {
        // Assume the LAST one is the decimal separator
        const lastDot = cleaned.lastIndexOf('.');
        const lastComma = cleaned.lastIndexOf(',');
        if (lastDot > lastComma) {
            // Dot is decimal, comma is thousand
            cleaned = cleaned.replace(/,/g, '');
        } else {
            // Comma is decimal, dot is thousand
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        }
    } else if (hasComma) {
        // Only comma, treat as decimal
        cleaned = cleaned.replace(',', '.');
    } else if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(cleaned)) {
        // "1.500" o "12.345.678": punto de miles en formato argentino. Sin esta
        // regla "1.500" se leía 1,5. "0.750" no entra (empieza con 0): es decimal.
        cleaned = cleaned.replace(/\./g, '');
    }
    // If only dot, treat as decimal (default parseFloat behavior)

    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}
