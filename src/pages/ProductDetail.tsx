import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { motion } from 'framer-motion';
import { useState } from 'react';
import Toast from '../components/Toast';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { state, dispatch, formatWeight } = useStore();
    const [showToast, setShowToast] = useState(false);

    const product = state.products.find(p => p.id === id && p.availableStock > 0);

    if (!product) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-5 text-center">
                <span aria-hidden="true" className="material-symbols-outlined text-6xl text-slate-300 mb-4">inventory_2</span>
                <h2 className="text-xl font-bold">Producto no encontrado</h2>
                <button type="button" onClick={() => navigate('/shop')} className="mt-4 px-5 py-2.5 rounded-full bg-primary text-slate-900 text-sm font-bold">Volver a la tienda</button>
            </div>
        );
    }

    const handleAddToCart = () => {
        dispatch({ type: 'ADD_TO_CART', productId: product!.id });
        setShowToast(true);
    };

    const handleRemoveFromCart = () => {
        dispatch({ type: 'DECREMENT_CART', productId: product!.id });
    };

    const cartQuantity = state.cart.find(item => item.productId === product!.id)?.quantity || 0;

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch({ type: 'TOGGLE_FAVORITE', productId: product.id });
    };

    const isFavorite = state.favorites.includes(product.id);

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen not-italic relative">
            {/* Immersive Header Image */}
            <div className="relative h-[50vh] w-full overflow-hidden">
                <motion.img
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.8 }}
                    src={product.image}
                    alt={product.name}
                    decoding="async"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent" />

                {/* Navigation Buttons */}
                <div className="absolute left-5 right-5 top-4 mt-safe flex justify-between items-center z-10">
                    <button
                        type="button"
                        aria-label="Volver"
                        onClick={() => navigate(-1)}
                        className="w-11 h-11 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/30 text-white active:scale-95 transition-transform"
                    >
                        <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
                    </button>
                    <button
                        type="button"
                        aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                        aria-pressed={isFavorite}
                        onClick={handleToggleFavorite}
                        className={`w-11 h-11 flex items-center justify-center rounded-full backdrop-blur-md border border-white/30 active:scale-95 transition-transform ${isFavorite ? 'bg-primary border-primary text-slate-900' : 'bg-black/30 text-white'}`}
                    >
                        <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                    </button>
                </div>
            </div>

            {/* Content Sheet */}
            <motion.main
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="relative -mt-12 bg-white dark:bg-slate-900 rounded-t-card px-6 pt-10 pb-40 shadow-2xl space-y-8 text-left max-w-2xl mx-auto"
            >
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-dark dark:text-primary">{product.category}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{formatWeight(1, product.isFractional)}</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">{product.name}</h1>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">${product.price.toFixed(2)}</span>
                        {product.availableStock === 0 && (
                            <span className="px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-500 text-[11px] font-bold rounded-lg uppercase tracking-tighter ring-1 ring-red-100 dark:ring-red-900/30">
                                Agotado
                            </span>
                        )}
                    </div>
                </div>

                {/* Dietary Badges */}
                {product.badges && product.badges.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {product.badges.map(badge => (
                            <div key={badge} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/20">
                                <span aria-hidden="true" className="material-symbols-outlined text-primary-dark dark:text-primary transition-colors" style={{ fontSize: '16px' }}>
                                    {['Sin TACC', 'Vegano', 'Sin Azúcar', 'Orgánico', 'Keto'].includes(badge) ? 'verified' : 'check_circle'}
                                </span>
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tighter">{badge}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Description */}
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-400 mb-4">Acerca de este producto</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        {product.fullDescription || product.description}
                    </p>
                </div>

                {/* Nutritional Info */}
                {product.nutritionalInfo && (
                    <div className="space-y-4 pt-2">
                        <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-400">Información Nutricional</h3>
                        <div className="grid grid-cols-4 gap-2">
                            {Object.entries(product.nutritionalInfo).map(([key, value]) => (
                                <div key={key} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                                    <span className="block text-[11px] font-bold uppercase text-slate-400 mb-1">{key === 'calories' ? 'Cal' : key === 'protein' ? 'Prot' : key === 'carbs' ? 'Carbs' : 'Grasa'}</span>
                                    <span className="block text-xs font-bold tracking-tighter">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Free Delivery Promo */}
                <div className="p-4 rounded-3xl bg-primary/5 dark:bg-primary/10 border border-primary/10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary-dark">
                        <span aria-hidden="true" className="material-symbols-outlined">local_shipping</span>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold">Retiro en el local o envío a domicilio</h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Coordinamos la entrega en Rada Tilly y alrededores.</p>
                    </div>
                </div>
            </motion.main>

            {/* Bottom Buy Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 z-50">
                <div className="flex items-center gap-4 max-w-lg mx-auto">
                    {/* Con el selector de cantidad visible no entra el bloque de total en 390px */}
                    {cartQuantity === 0 && (
                        <div className="hidden xs:block flex-shrink-0">
                            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total</span>
                            <span className="text-xl font-bold">${product.price.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex flex-1 items-center gap-3">
                        {cartQuantity > 0 && (
                            <div className="flex items-center gap-1.5 h-14 px-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                                <button
                                    type="button"
                                    aria-label="Quitar una unidad"
                                    onClick={handleRemoveFromCart}
                                    className="w-10 h-11 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 flex items-center justify-center active:scale-90 transition-all shadow-sm"
                                >
                                    <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '20px' }}>remove</span>
                                </button>
                                <span className="px-1.5 text-xs font-bold tabular-nums whitespace-nowrap">
                                    {formatWeight(cartQuantity, product.isFractional)}
                                </span>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={handleAddToCart}
                            disabled={product.availableStock === 0}
                            className={`flex-1 h-14 rounded-2xl font-bold shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 ${product.availableStock === 0 ? 'bg-slate-200 text-slate-400' : 'bg-primary text-slate-900'
                                }`}
                        >
                            <span aria-hidden="true" className="material-symbols-outlined">shopping_bag</span>
                            {cartQuantity > 0 ? 'Añadir otro' : 'Añadir al carrito'}
                        </button>
                    </div>
                </div>
            </div>

            <Toast
                message="¡Producto añadido!"
                isVisible={showToast}
                onClose={() => setShowToast(false)}
            />
        </div>
    );
};

export default ProductDetail;
