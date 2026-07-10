import { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { generateWhatsAppLink } from '../utils/whatsappUtils';
import { sendOrderNotification } from '../utils/notificationService';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';


const Cart = () => {
    const { state, dispatch, placeOrder, formatWeight } = useStore();
    const { showToast } = useNotifications();
    const { profile, isAuthenticated } = useAuth();
    const [customerName, setCustomerName] = useState(profile?.full_name || '');
    const [customerPhone, setCustomerPhone] = useState(profile?.phone || '');
    const [isOrdered, setIsOrdered] = useState(false);
    const [lastOrderId, setLastOrderId] = useState('');
    const [deliveryMethod, setDeliveryMethod] = useState<'Retiro' | 'Envío'>('Retiro');
    const [address, setAddress] = useState(profile?.address || '');
    const [deliveryZone, setDeliveryZone] = useState<string>('Rada Tilly');
    const [lastOrderSummary, setLastOrderSummary] = useState<{ items: any[], total: number } | null>(null);

    // Sync profile data when it loads
    useEffect(() => {
        if (profile) {
            if (!customerName) setCustomerName(profile.full_name || '');
            if (!customerPhone) setCustomerPhone(profile.phone || '');
            if (!address) setAddress(profile.address || '');
        }
    }, [profile]);

    const cartItems = state.cart.map(item => {
        const product = state.products.find(p => p.id === item.productId)!;
        return { ...item, ...product };
    });

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Lógica de Envío Gratis
    const isFreeShipping = state.freeShippingThreshold > 0 && subtotal >= state.freeShippingThreshold;
    const deliveryFee = useMemo(() => {
        if (deliveryMethod !== 'Envío') return 0;
        if (deliveryZone === 'Rada Tilly' && isFreeShipping) return 0;
        return state.deliveryFees[deliveryZone] || 0;
    }, [deliveryMethod, deliveryZone, isFreeShipping, state.deliveryFees]);
    const total = subtotal + deliveryFee;
    const priceWithoutNationalTaxes = total * 0.895; // Restamos el 10.5%

    const handleAddToCart = (productId: string) => {
        dispatch({ type: 'ADD_TO_CART', productId });
    };

    const handleDecrementFromCart = (productId: string) => {
        dispatch({ type: 'DECREMENT_CART', productId });
    };

    const handlePlaceOrder = async () => {
        if (!customerName || !customerPhone) {
            showToast('Por favor, ingresa tu nombre y teléfono para coordinar la entrega.', 'warning');
            return;
        }

        if (deliveryMethod === 'Envío' && !address) {
            showToast('Por favor, ingresa tu dirección de envío.', 'warning');
            return;
        }

        try {
            const orderSummary = {
                items: cartItems.map(item => ({
                    name: item.name,
                    quantity: formatWeight(item.quantity, item.isFractional),
                    price: item.price
                })),
                total: total
            };

            const orderId = await placeOrder({
                customerName,
                customerPhone,
                deliveryMethod,
                deliveryZone: deliveryMethod === 'Envío' ? deliveryZone : undefined,
                deliveryFee: deliveryFee,
                address: deliveryMethod === 'Envío' ? address : undefined
            });

            setLastOrderSummary(orderSummary);
            setLastOrderId(orderId);
            setIsOrdered(true);

            // Envío automático de notificación por email al dueño
            sendOrderNotification({
                orderId,
                customerName,
                customerPhone,
                deliveryMethod,
                deliveryZone: deliveryMethod === 'Envío' ? deliveryZone : undefined,
                address,
                total: orderSummary.total,
                items: orderSummary.items
            });
        } catch (error: any) {
            console.error('Error al realizar el pedido:', error);
            showToast('Hubo un error al procesar tu pedido. Por favor intenta de nuevo.', 'error');
        }
    };

    if (isOrdered) {
        const waLink = lastOrderSummary ? generateWhatsAppLink({
            orderId: lastOrderId,
            customerName,
            customerPhone,
            deliveryMethod,
            deliveryZone: deliveryMethod === 'Envío' ? deliveryZone : undefined,
            address,
            total: lastOrderSummary.total,
            deliveryFee: deliveryMethod === 'Envío' ? deliveryFee : undefined,
            items: lastOrderSummary.items
        }) : '#';

        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-6 text-center font-display">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <span className="material-symbols-outlined text-4xl text-primary font-bold">check</span>
                </div>
                <h1 className="text-2xl font-bold mb-2">¡Reserva Completada!</h1>
                <p className="text-slate-500 mb-8 max-w-xs">
                    Tu pedido <span className="text-primary-dark font-bold">#{lastOrderId}</span> ha sido recibido.
                    <br />
                    Para agilizar la entrega y coordinar el pago, **confirma tu pedido por WhatsApp**.
                </p>

                <div className="w-full max-w-xs space-y-3">
                    <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 bg-[#25D366] text-white font-black py-4 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        <span>Confirmar por WhatsApp</span>
                    </a>

                    <Link to="/shop" className="flex w-full items-center justify-center font-bold py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Volver a la Tienda
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <main className="relative w-full max-w-md h-screen overflow-hidden bg-background-light dark:bg-background-dark shadow-2xl mx-auto flex flex-col font-display antialiased text-slate-900 dark:text-slate-100 italic-none">
            <header className="flex items-center justify-between p-4 pt-12 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-20">
                <Link to="/shop" className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <span className="material-symbols-outlined text-slate-900 dark:text-white" style={{ fontSize: '20px' }}>arrow_back_ios_new</span>
                </Link>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Mi Carrito</h1>
                <div className="w-10"></div>
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-40 px-4 space-y-6">
                <div className="space-y-4 pt-2">
                    {cartItems.length > 0 ? cartItems.map((item) => (
                        <div key={item.productId} className="group relative flex gap-4 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-primary/50 transition-colors text-left animate-in slide-in-from-right duration-300">
                            <div className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
                                <img alt={item.name} className="w-full h-full object-cover" src={item.image} />
                            </div>
                            <div className="flex flex-1 flex-col justify-between py-0.5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{item.name}</h3>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 text-left">{formatWeight(1, item.isFractional)}</p>
                                    </div>
                                    <p className="font-bold text-slate-900 dark:text-white">${(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <p className="text-[10px] text-green-600 dark:text-primary font-medium bg-green-50 dark:bg-primary/10 px-2 py-0.5 rounded-full">En stock</p>
                                    <div className="flex items-center bg-slate-50 dark:bg-slate-700/50 rounded-full p-1 border border-slate-100 dark:border-slate-600">
                                        <button
                                            onClick={() => handleDecrementFromCart(item.productId)}
                                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white hover:scale-105 active:scale-95 transition-transform"
                                        >
                                            <span className="material-symbols-outlined text-xs">{item.quantity <= (item.isFractional ? (item.fractionalStep || 0) / 1000 : 1) ? 'delete' : 'remove'}</span>
                                        </button>
                                        <span className="w-14 text-center text-[10px] font-bold text-slate-900 dark:text-white tracking-tighter">{formatWeight(item.quantity, item.isFractional)}</span>
                                        <button
                                            onClick={() => handleAddToCart(item.productId)}
                                            className="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-slate-900 shadow-sm hover:scale-105 active:scale-95 transition-transform"
                                        >
                                            <span className="material-symbols-outlined text-xs font-bold">add</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="py-20 text-center opacity-30">
                            <span className="material-symbols-outlined text-6xl mb-2">shopping_basket</span>
                            <p>Tu carrito está vacío</p>
                            <Link to="/shop" className="text-primary-dark font-bold text-sm mt-2 block">Ir a comprar</Link>
                        </div>
                    )}
                </div>

                {cartItems.length > 0 && (
                    <>
                        {/* Selector de Método de Entrega */}
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded-2xl flex border border-slate-100 dark:border-slate-700/50">
                            <button
                                onClick={() => setDeliveryMethod('Retiro')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${deliveryMethod === 'Retiro' ? 'bg-white dark:bg-slate-700 shadow-md text-primary-dark dark:text-primary scale-[1.02]' : 'text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined text-lg">storefront</span>
                                Retiro en Local
                            </button>
                            <button
                                onClick={() => setDeliveryMethod('Envío')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all relative overflow-hidden ${deliveryMethod === 'Envío' ? 'bg-white dark:bg-slate-700 shadow-md text-primary-dark dark:text-primary scale-[1.02]' : 'text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined text-lg">local_shipping</span>
                                Envío a Domicilio
                            </button>
                        </div>

                        {/* Indicador de Envío Gratis (Persistente) */}
                        {state.freeShippingThreshold > 0 && (
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm animate-in fade-in zoom-in duration-300">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`material-symbols-outlined text-xl ${isFreeShipping ? 'text-primary' : 'text-slate-400'}`}>
                                            {isFreeShipping ? 'check_circle' : 'local_shipping'}
                                        </span>
                                        <span className="text-xs font-bold">
                                            {isFreeShipping ? '¡Tienes envío gratis!' : 'Envío gratis a partir de'}
                                        </span>
                                    </div>
                                    <span className="text-xs font-black text-primary">${state.freeShippingThreshold}</span>
                                </div>

                                {!isFreeShipping ? (
                                    <>
                                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-500 ease-out"
                                                style={{ width: `${Math.min((subtotal / state.freeShippingThreshold) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-2 font-medium">
                                            El envío en Rada Tilly es en compras superiores a <span className="font-bold">${state.freeShippingThreshold}</span>. Te faltan <span className="font-bold text-slate-900 dark:text-white">${(state.freeShippingThreshold - subtotal).toFixed(2)}</span> para llegar.
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-[10px] text-primary-dark dark:text-primary font-bold">
                                        Has alcanzado el beneficio de envío gratis a domicilio.
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="space-y-4 pt-2 text-left">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Datos para la Entrega</h2>
                                {isAuthenticated && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-full border border-primary/20">
                                        <span className="material-symbols-outlined text-[12px] text-primary-dark">bolt</span>
                                        <span className="text-[10px] font-bold text-primary-dark uppercase">Datos Guardados</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Tu nombre completo"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 placeholder:text-slate-400 focus:ring-2 focus:ring-primary outline-none text-sm transition-all"
                                />
                                <input
                                    type="tel"
                                    placeholder="Teléfono (ej: 2974174655)"
                                    value={customerPhone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setCustomerPhone(val);
                                    }}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 placeholder:text-slate-400 focus:ring-2 focus:ring-primary outline-none text-sm transition-all"
                                />
                                {deliveryMethod === 'Envío' && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="relative">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Zona de Envío</label>
                                            <select
                                                value={deliveryZone}
                                                onChange={(e) => setDeliveryZone(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-10 text-sm focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer appearance-none"
                                            >
                                                {Object.keys(state.deliveryFees).map((zone) => {
                                                    const fee = state.deliveryFees[zone];
                                                    const isRadaTillyFree = zone === 'Rada Tilly' && isFreeShipping;
                                                    return (
                                                        <option key={zone} value={zone}>
                                                            {zone} ({isRadaTillyFree ? 'Envío Gratis' : `$${fee}`})
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <div className="pointer-events-none absolute right-4 top-[38px] text-slate-400">
                                                <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Dirección Exacta</label>
                                            <input
                                                type="text"
                                                placeholder="Dirección exacta (Calle, número, depto)"
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 placeholder:text-slate-400 focus:ring-2 focus:ring-primary outline-none text-sm transition-all"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-6 pb-2 text-left">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">Resumen del Pedido</h2>
                            {deliveryMethod === 'Envío' && (
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-slate-600 dark:text-slate-400 font-bold text-sm">Envío ({deliveryZone})</span>
                                    <span className={`font-bold text-sm ${deliveryFee === 0 ? 'text-primary italic' : 'text-slate-900 dark:text-white'}`}>
                                        {deliveryFee === 0 ? 'GRATIS' : `$\${deliveryFee.toFixed(2)}`}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-4 border-t border-dashed border-slate-300 dark:border-slate-600">
                                <span className="text-slate-900 dark:text-white font-bold text-lg">Total</span>
                                <span className="text-slate-900 dark:text-white font-bold text-2xl tracking-tight">${total.toFixed(2)}</span>
                            </div>
                            <div className="mt-2 flex justify-end">
                                <div className="bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                        Precio sin impuestos nacionales: <span className="font-bold text-slate-700 dark:text-slate-300">${priceWithoutNationalTaxes.toFixed(2)}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {cartItems.length > 0 && (
                <div className="absolute bottom-0 left-0 w-full bg-background-light dark:bg-background-dark p-4 border-t border-slate-100 dark:border-slate-800 z-30">
                    <button
                        onClick={handlePlaceOrder}
                        className="w-full bg-primary hover:bg-[#72d411] active:scale-[0.98] transition-all text-slate-900 font-bold text-base py-4 rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
                    >
                        Completar Reserva
                        <span className="material-symbols-outlined">send</span>
                    </button>
                </div>
            )}
        </main>
    );
};

export default Cart;
