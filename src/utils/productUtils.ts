import type { Product } from '../types';

/**
 * Si el producto se muestra en la tienda: tiene que tener stock y precio.
 * Un producto sin precio cargado se podía pedir a $0; place_order también lo
 * rechaza, esto es para que el cliente ni lo vea.
 */
export const isForSale = (p: Product) => p.availableStock > 0 && p.price > 0;
