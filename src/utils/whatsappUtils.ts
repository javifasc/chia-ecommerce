export const OWNER_PHONE = '5492974174655';

interface WhatsAppMessageData {
    orderId: string;
    customerName: string;
    customerPhone: string;
    deliveryMethod: string;
    deliveryZone?: string;
    address?: string;
    total: number;
    items: { name: string; quantity: string; price: number }[];
}

export const generateWhatsAppLink = (data: WhatsAppMessageData) => {
    const itemsList = data.items
        .map(item => `• ${item.quantity} x ${item.name} ($${(item.price * parseFloat(item.quantity)).toFixed(2)})`)
        .join('\n');

    const message = `🛒 *Nueva Reserva - #CHIA*

*Pedido:* #${data.orderId}
*Cliente:* ${data.customerName}
*Contacto:* ${data.customerPhone}
*Entrega:* ${data.deliveryMethod}${data.deliveryMethod === 'Envío' ? ` (${data.deliveryZone})\n*Dirección:* ${data.address}` : ''}

*Detalle:*
${itemsList}

*Total:* $${data.total.toFixed(2)}

Hola! Acabo de realizar una reserva en la tienda. Espero tu contacto para coordinar el pago y la entrega. Gracias!`;

    return `https://wa.me/${OWNER_PHONE}?text=${encodeURIComponent(message)}`;
};
