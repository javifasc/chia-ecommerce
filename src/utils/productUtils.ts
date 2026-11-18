import type { Product } from '../types';

/**
 * Si el producto se muestra en la tienda: tiene que tener stock y precio.
 * Un producto sin precio cargado se podía pedir a $0; place_order también lo
 * rechaza, esto es para que el cliente ni lo vea.
 */
export const isForSale = (p: Product) => p.availableStock > 0 && p.price > 0;

/**
 * Cantidad de un ítem de pedido para mostrar ("250gr", "3 un.").
 * Si el producto ya no existe, se deduce de la cantidad: con decimales es por peso.
 */
export const formatOrderQuantity = (
    products: Product[],
    item: { productId: string; quantity: number },
    formatWeight: (val: number, isFractional?: boolean) => string
) => {
    const product = products.find(p => p.id === item.productId);
    const isFractional = product ? !!product.isFractional : !Number.isInteger(item.quantity);
    return formatWeight(item.quantity, isFractional);
};
