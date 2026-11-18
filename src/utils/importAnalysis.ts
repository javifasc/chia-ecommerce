import type { Product } from '../types';
import type { ParsedStockRow } from './xlsxParser';
import { isForSale } from './productUtils';

export type ImportAnalysis = {
    /** Productos de la tienda que el Excel actualiza. */
    matched: number;
    /** Códigos que no existen en la tienda: se crean. */
    created: number;
    /** De los nuevos, cuántos se verían en la tienda enseguida (sin foto). */
    createdVisible: number;
    /** Hoy se ven en la tienda y después de importar no (quedan sin stock o sin precio). */
    leavingStore: number;
    /** Cambian de precio más de un 50%. */
    bigPriceChanges: number;
    /** Ejemplos de esos cambios, para mostrar. */
    priceExamples: { name: string; from: number; to: number }[];
    /** Señales de que el archivo puede no ser el correcto. */
    warnings: string[];
};

const BIG_CHANGE = 0.5;

/** Supera el umbral: al menos `min` casos y más del `share` del total. */
const isSuspicious = (count: number, total: number, share = 0.2, min = 10) =>
    count >= min && count > total * share;

/**
 * Compara el Excel con lo que hay en la tienda para mostrar qué va a cambiar
 * antes de importar, y avisar si parece un archivo equivocado.
 */
export function analyzeImport(rows: ParsedStockRow[], products: Product[]): ImportAnalysis {
    const byCode = new Map<string, Product>();
    products.forEach(p => { if (p.codigo) byCode.set(p.codigo.trim(), p); });

    let matched = 0;
    let created = 0;
    let createdVisible = 0;
    let leavingStore = 0;
    let bigPriceChanges = 0;
    const priceExamples: ImportAnalysis['priceExamples'] = [];

    for (const row of rows) {
        const product = byCode.get(row.codigo.trim());
        const price = Number(row.ventaValorizada.toFixed(2));

        if (!product) {
            created++;
            if (row.stock > 0 && price > 0) createdVisible++;
            continue;
        }

        matched++;
        const newAvailable = Math.max(0, row.stock - product.reservedStock);
        if (isForSale(product) && !(newAvailable > 0 && price > 0)) leavingStore++;

        if (product.price > 0 && price > 0 && Math.abs(price - product.price) / product.price > BIG_CHANGE) {
            bigPriceChanges++;
            if (priceExamples.length < 3) priceExamples.push({ name: product.name, from: product.price, to: price });
        }
    }

    const warnings: string[] = [];
    if (isSuspicious(created, rows.length)) {
        warnings.push(`${created} de ${rows.length} códigos no existen en la tienda. ¿Es el Excel del sistema de caja?`);
    }
    const visibleNow = products.filter(isForSale).length;
    if (isSuspicious(leavingStore, visibleNow)) {
        warnings.push(`${leavingStore} productos dejarían de verse en la tienda (quedan sin stock o sin precio).`);
    }
    if (isSuspicious(bigPriceChanges, matched)) {
        warnings.push(`${bigPriceChanges} productos cambian de precio más de un 50%.`);
    }

    return { matched, created, createdVisible, leavingStore, bigPriceChanges, priceExamples, warnings };
}
