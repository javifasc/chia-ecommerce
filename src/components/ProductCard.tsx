import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';

const DIET_BADGES = ['Sin TACC', 'Vegano', 'Sin Azúcar', 'Orgánico', 'Keto'];

type Props = {
    product: Product;
    /** Muestra el stock disponible debajo del nombre (vista Inicio). */
    showStock?: boolean;
    onAdded?: () => void;
    /** Las primeras tarjetas cargan de inmediato; el resto en diferido. */
    eager?: boolean;
};

const ProductCard = ({ product, showStock = false, onAdded, eager = false }: Props) => {
    const { state, dispatch, formatWeight } = useStore();

    const quantity = state.cart.find(item => item.productId === product.id)?.quantity || 0;
    const isFavorite = state.favorites.includes(product.id);
    const isSoldOut = product.availableStock === 0;
    const diet = (product.badges || []).filter(b => DIET_BADGES.includes(b)).slice(0, 2);

    const add = () => {
        dispatch({ type: 'ADD_TO_CART', productId: product.id });
        onAdded?.();
    };

    return (
        <div className="group relative flex flex-col bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow text-left">
            <Link to={`/product/${product.id}`} className="block">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 mb-3">
                    <img
                        src={product.image}
                        alt={product.name}
                        loading={eager ? 'eager' : 'lazy'}
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {isSoldOut && (
                        <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold tracking-wide">
                            AGOTADO
                        </span>
                    )}
                    {quantity > 0 && (
                        <span className="absolute top-2 left-2 max-w-[calc(100%-3.5rem)] truncate bg-primary text-slate-900 text-[11px] font-bold px-2 py-1 rounded-lg shadow-sm ring-1 ring-black/5">
                            {formatWeight(quantity, product.isFractional)} en carrito
                        </span>
                    )}
                </div>
            </Link>

            <button
                type="button"
                aria-label={isFavorite ? `Quitar ${product.name} de favoritos` : `Añadir ${product.name} a favoritos`}
                aria-pressed={isFavorite}
                onClick={() => dispatch({ type: 'TOGGLE_FAVORITE', productId: product.id })}
                className={`absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center shadow-sm backdrop-blur transition-colors ${isFavorite
                    ? 'bg-primary text-slate-900'
                    : 'bg-white/90 dark:bg-slate-900/90 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
            >
                <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '18px', fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
                >
                    favorite
                </span>
            </button>

            <Link to={`/product/${product.id}`} className="block">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug mb-1 line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                </h3>
            </Link>

            {diet.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {diet.map(tag => (
                        <span
                            key={tag}
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary-dark dark:bg-primary/15 dark:text-primary"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                {showStock ? (
                    <>
                        {formatWeight(1, product.isFractional)} ·{' '}
                        <span className={isSoldOut ? 'text-red-500' : 'text-primary-dark dark:text-primary'}>
                            {formatWeight(product.availableStock, product.isFractional)} disp.
                        </span>
                    </>
                ) : (
                    product.unit
                )}
            </p>

            <div className="flex items-center justify-between gap-2 mt-auto">
                <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    ${product.price.toFixed(2)}
                </span>
                <div className="flex items-center gap-1.5">
                    {quantity > 0 && (
                        <button
                            type="button"
                            aria-label={`Quitar una unidad de ${product.name}`}
                            onClick={() => dispatch({ type: 'DECREMENT_CART', productId: product.id })}
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-red-500 border border-slate-200 dark:border-slate-600 active:scale-90 transition-all"
                        >
                            <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '18px' }}>remove</span>
                        </button>
                    )}
                    <button
                        type="button"
                        aria-label={`Añadir ${product.name} al carrito`}
                        disabled={isSoldOut}
                        onClick={add}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform ${isSoldOut
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-primary text-slate-900'
                            }`}
                    >
                        <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;

export const ProductCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-pulse space-y-3">
        <div className="aspect-square bg-slate-200 dark:bg-slate-700 rounded-xl" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
        <div className="flex justify-between items-center pt-2">
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
    </div>
);
