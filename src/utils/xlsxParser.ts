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
};

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

                // Convert to JSON (header row becomes keys)
                const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

                const errors: string[] = [];
                const rows: ParsedStockRow[] = [];

                rawRows.forEach((row, index) => {
                    // Try to find columns (flexible matching)
                    const codigo = String(findCol(row, ['Código', 'Codigo', 'codigo', 'CODIGO', 'Cod', 'Code']) || '').trim();
                    const nombre = String(findCol(row, ['Nombre', 'nombre', 'NOMBRE', 'Descripcion', 'Descripción', 'Name']) || '').trim();
                    const familia = String(findCol(row, ['Familia', 'familia', 'FAMILIA', 'Categoría', 'Categoria', 'Category']) || '').trim();
                    const deposito = String(findCol(row, ['Depósito', 'Deposito', 'deposito', 'DEPOSITO', 'Deposit']) || '').trim();
                    const stockRaw = findCol(row, ['Stock', 'stock', 'STOCK', 'Cantidad', 'Qty']);
                    const costoRaw = findCol(row, ['Costo Valorizado', 'Costo', 'costo', 'COSTO', 'Cost']);
                    const ventaRaw = findCol(row, ['Venta Valorizada', 'Venta', 'venta', 'VENTA', 'Precio', 'Price']);

                    if (!codigo) {
                        errors.push(`Fila ${index + 2}: Sin código, se omite.`);
                        return;
                    }

                    const stock = parseNumber(stockRaw);
                    const costoValorizado = parseNumber(costoRaw);
                    const ventaValorizada = parseNumber(ventaRaw);

                    rows.push({
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
                    rows,
                    errors,
                    totalRows: rawRows.length
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
    }
    // If only dot, treat as decimal (default parseFloat behavior)

    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}
