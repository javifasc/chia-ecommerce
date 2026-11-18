const FORM_SUBMIT_URL = 'https://formsubmit.co/ajax/chiaalmacennaturalrada@gmail.com';

interface OrderNotificationData {
    orderId: string;
    customerName: string;
    customerPhone: string;
    deliveryMethod: string;
    deliveryZone?: string;
    address?: string;
    total: number;
    items: { name: string; quantity: string; lineTotal: number }[];
}

export const sendOrderNotification = async (data: OrderNotificationData) => {
    const itemsList = data.items
        .map(item => `${item.quantity} x ${item.name} ($${item.lineTotal.toFixed(2)})`)
        .join(', ');

    // Limpiar el teléfono para el link de WhatsApp (solo números)
    // wa.me necesita el número internacional: 2974174655 -> 5492974174655.
    const digits = data.customerPhone.replace(/\D/g, '');
    const cleanPhone = digits.startsWith('54') ? digits : `549${digits}`;

    // Crear un mensaje detallado para que el dueño le envíe al cliente
    const itemsDetailWA = data.items
        .map(item => `• ${item.quantity} x ${item.name} ($${item.lineTotal.toFixed(2)})`)
        .join('\n');

    const waMessage = `Hola ${data.customerName}! Soy del equipo de CHiA. Recibimos tu reserva ${data.orderId}.\n\n*Detalle del pedido:*\n${itemsDetailWA}\n\n*Total:* $${data.total.toFixed(2)}\n\nMe contacto para coordinar el pago y la entrega.`;
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`;

    const payload = {
        _subject: `Nueva Reserva #CHIA - ${data.orderId} - ${data.customerName}`,
        Plataforma: 'CHiA - E-commerce Natural',
        Notificacion: '¡Se ha realizado una nueva venta en la web!',
        ID_Pedido: data.orderId,
        Cliente: data.customerName,
        Telefono: data.customerPhone,
        Whatsapp: whatsappLink, // Link directo al chat del cliente
        Entrega: data.deliveryMethod,
        Zona: data.deliveryZone || 'N/A',
        Direccion: data.address || 'N/A',
        Detalle: itemsList,
        Total: `$${data.total.toFixed(2)}`,
        _template: 'table', // FormSubmit table template
        _captcha: 'false'   // Disable captcha for AJAX
    };

    try {
        const response = await fetch(FORM_SUBMIT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log('Notificación de email enviada:', result);
        return result.success;
    } catch (error) {
        console.error('Error al enviar notificación de email:', error);
        return false;
    }
};
