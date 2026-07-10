import { useState, useMemo, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import { CATEGORIES_MAP } from '../utils/categoryMapping';
import { Link } from 'react-router-dom';
import FilterModal from '../components/FilterModal';
import Toast from '../components/Toast';
import SuggestionBox from '../components/SuggestionBox';

const Home = () => {
    const { state, dispatch, formatWeight } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todo');
    const [selectedSubcategory, setSelectedSubcategory] = useState('Todo');
    const [maxPrice, setMaxPrice] = useState(9999999);
    const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);

    const categories = useMemo(() => {
        return ['Todo', ...Object.keys(CATEGORIES_MAP)];
    }, []);

    const productPopularity = useMemo(() => {
        const stats: Record<string, number> = {};
        const allOrders = [...state.orders, ...state.historyOrders];
        allOrders.forEach(order => {
            order.items.forEach(item => {
                stats[item.productId] = (stats[item.productId] || 0) + item.quantity;
            });
        });
        return stats;
    }, [state.orders, state.historyOrders]);

    const filteredProducts = useMemo(() => {
        let products = state.products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'Todo' || p.category === selectedCategory;
            const matchesSubcategory = selectedSubcategory === 'Todo' || p.subcategory === selectedSubcategory;
            const matchesPrice = p.price <= maxPrice;
            const matchesBadges = selectedBadges.length === 0 ||
                selectedBadges.every(badge => p.badges?.includes(badge));
            const hasStock = p.availableStock > 0;
            return matchesSearch && matchesCategory && matchesSubcategory && matchesPrice && matchesBadges && hasStock;
        });

        // If showing "Popular Products" (Todo + No Search + No other filters), sort by sales and limit to 15
        if (selectedCategory === 'Todo' && !searchQuery && maxPrice >= 9999999 && selectedBadges.length === 0) {
            products = [...products].sort((a, b) => (productPopularity[b.id] || 0) - (productPopularity[a.id] || 0));
            return products.slice(0, 15);
        }

        return products;
    }, [state.products, searchQuery, selectedCategory, selectedSubcategory, maxPrice, selectedBadges, productPopularity]);

    const newArrivals = useMemo(() => {
        return state.products.filter(p => p.isNewArrival && p.availableStock > 0);
    }, [state.products]);

    const cartCount = state.cart.reduce((sum, item) => {
        const product = state.products.find(p => p.id === item.productId);
        return sum + (product?.isFractional ? 1 : item.quantity);
    }, 0);

    const handleAddToCart = (productId: string) => {
        dispatch({ type: 'ADD_TO_CART', productId });
        setToastMessage('¡Añadido al carrito!');
        setShowToast(true);
    };

    const handleRemoveFromCart = (productId: string) => {
        dispatch({ type: 'DECREMENT_CART', productId });
    };

    const getProductQuantity = (productId: string) => {
        return state.cart.find(item => item.productId === productId)?.quantity || 0;
    };

    const handleToggleFavorite = (productId: string) => {
        dispatch({ type: 'TOGGLE_FAVORITE', productId });
    };

    // Advanced Scroll Logic
    const categoryScrollRef = useRef<HTMLDivElement>(null);
    const subcategoryScrollRef = useRef<HTMLDivElement>(null);

    const setupScrollHandlers = (ref: React.RefObject<HTMLDivElement>) => {
        const onWheel = (e: React.WheelEvent) => {
            if (ref.current) {
                ref.current.scrollLeft += e.deltaY;
            }
        };

        const onMouseDown = (e: React.MouseEvent) => {
            if (!ref.current) return;
            const slider = ref.current;
            const startX = e.pageX - slider.offsetLeft;
            const scrollLeft = slider.scrollLeft;

            const onMouseMove = (moveEvent: MouseEvent) => {
                moveEvent.preventDefault();
                const x = moveEvent.pageX - slider.offsetLeft;
                const walk = (x - startX) * 2;
                slider.scrollLeft = scrollLeft - walk;
            };

            const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        };

        return { onWheel, onMouseDown };
    };

    const catScrollHandlers = setupScrollHandlers(categoryScrollRef);
    const subScrollHandlers = setupScrollHandlers(subcategoryScrollRef);

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen pb-24 relative selection:bg-primary selection:text-slate-900">
            {/* Top Bar */}
            <header className="sticky top-0 z-50 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-5 pt-6 pb-2">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-24 h-24 flex items-center justify-center overflow-hidden">
                            <img
                                alt="#CHIA Logo"
                                className="w-full h-full object-contain"
                                src="/logo.png"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=100&auto=format&fit=crop";
                                    (e.target as HTMLImageElement).style.opacity = "0.5";
                                }}
                            />
                        </div>
                        <div>
                            <p className="text-[10px] text-primary font-black uppercase tracking-widest">Almacén Natural</p>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">#CHIA</h2>
                        </div>
                    </div>
                    <Link to="/cart" className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform">
                        <span className="material-symbols-outlined text-slate-800 dark:text-white" style={{ fontSize: '20px' }}>shopping_cart</span>
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[10px] font-bold text-slate-900 flex items-center justify-center rounded-full animate-in zoom-in duration-300">
                                {cartCount}
                            </span>
                        )}
                    </Link>
                </div>
                {/* Search Bar */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-sage" style={{ fontSize: '20px' }}>search</span>
                    </div>
                    <input
                        className="block w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border-none rounded-2xl text-sm placeholder:text-sage/60 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary shadow-sm"
                        placeholder="Buscar productos saludables..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className={`rounded-lg p-1.5 transition-colors ${maxPrice < 100 ? 'bg-primary text-slate-900' : 'bg-primary/20 hover:bg-primary/40 text-slate-800 dark:text-slate-200'}`}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>tune</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Scrollable */}
            <main className="flex flex-col gap-6 px-5 pt-2">
                {/* Filters Section */}
                <div className="flex flex-col gap-2 sticky top-[73px] z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md -mx-5 px-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                    {/* Category Navigation */}
                    <div
                        ref={categoryScrollRef}
                        {...catScrollHandlers}
                        className="w-full overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none"
                    >
                        <div className="flex gap-3 min-w-max py-2">
                            {categories.map((cat) => {
                                const ICONS: Record<string, string> = {
                                    'Todo': 'eco',
                                    'Almacén Seco': 'warehouse',
                                    'Desayuno & Merienda': 'bakery_dining',
                                    'Chocolatería & Dulces': 'cookie',
                                    'Bebidas Calientes': 'coffee',
                                    'Condimentos & Saborizantes': 'local_fire_department',
                                    'Salud & Bienestar': 'spa',
                                    'Snacks': 'lunch_dining',
                                    'Refrigerados': 'kitchen',
                                    'Congelados': 'ac_unit',
                                };
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            setSelectedCategory(cat);
                                            setSelectedSubcategory('Todo');
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all active:scale-95 whitespace-nowrap ${selectedCategory === cat
                                            ? 'bg-primary text-slate-900 font-bold shadow-sm'
                                            : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                            {ICONS[cat] || 'folder_open'}
                                        </span>
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Subcategory Navigation */}
                    {selectedCategory !== 'Todo' && (
                        <div
                            ref={subcategoryScrollRef}
                            {...subScrollHandlers}
                            className="w-full overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none border-t border-slate-100/50 dark:border-slate-800/50 pt-1"
                        >
                            <div className="flex gap-2 min-w-max py-1.5">
                                {['Todo', ...(CATEGORIES_MAP[selectedCategory] || [])].map((sub) => (
                                    <button
                                        key={sub}
                                        onClick={() => setSelectedSubcategory(sub)}
                                        className={`px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all active:scale-95 whitespace-nowrap ${selectedSubcategory === sub
                                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50'
                                            }`}
                                    >
                                        {sub}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Hero Banner (Only shown in 'Todo' or as generic promo) */}
                {selectedCategory === 'Todo' && (
                    <div className="relative w-full rounded-3xl overflow-hidden aspect-[16/9] shadow-lg group">
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent z-10"></div>
                        <img alt={state.promotions.hero.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={state.promotions.hero.image} />
                        <div className="absolute bottom-0 left-0 p-6 z-20 w-3/4 text-left">
                            <span className="inline-block px-3 py-1 bg-primary text-slate-900 text-xs font-bold rounded-lg mb-2">{state.promotions.hero.tag}</span>
                            <h2 className="text-2xl font-bold text-white mb-2 leading-tight">{state.promotions.hero.title}</h2>
                            <p className="text-white/90 text-sm mb-4 font-medium">{state.promotions.hero.description}</p>
                            <button className="bg-white text-slate-900 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm active:scale-95 transition-transform flex items-center gap-2">
                                {state.promotions.hero.buttonText}
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* New Arrivals Section */}
                {selectedCategory === 'Todo' && !searchQuery && newArrivals.length > 0 && (
                    <section className="mb-2">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Novedades</h3>
                            </div>
                            <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-lg uppercase tracking-widest">Lo nuevo</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 text-left mb-8">
                            {newArrivals.map((product: Product) => (
                                <div key={product.id} className="group relative bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <Link to={`/product/${product.id}`} className="block">
                                        <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-sage-light/20">
                                            {product.availableStock === 0 && (
                                                <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-bold z-10">AGOTADO</span>
                                            )}
                                            {getProductQuantity(product.id) > 0 && (
                                                <span className="absolute top-2 right-2 bg-primary text-slate-900 text-[10px] font-black px-2 py-1 rounded-lg z-10 shadow-lg ring-1 ring-black/5">
                                                    EN CARRITO: {formatWeight(getProductQuantity(product.id), product.isFractional)}
                                                </span>
                                            )}
                                            <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-700 mb-3">
                                                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                                                    {product.badges?.filter(b => ['Sin TACC', 'Vegano', 'Sin Azúcar', 'Orgánico', 'Keto'].includes(b)).map(tag => (
                                                        <span key={tag} className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-slate-800 dark:text-slate-200 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 uppercase tracking-tighter">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleToggleFavorite(product.id);
                                                }}
                                                className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-sm backdrop-blur transition-all ${state.favorites.includes(product.id)
                                                    ? 'bg-primary text-slate-900'
                                                    : 'bg-white/90 dark:bg-slate-900/90 text-slate-400'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: state.favorites.includes(product.id) ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                                            </button>
                                        </div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1 truncate">{product.name}</h4>
                                    </Link>
                                    <p className="text-xs text-sage mb-2 text-left">{formatWeight(1, product.isFractional)} • <span className={product.availableStock > 0 ? 'text-green-600' : 'text-red-500'}>{formatWeight(product.availableStock, product.isFractional)} disp.</span></p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-base font-bold text-slate-900 dark:text-white">${product.price.toFixed(2)}</span>
                                        <div className="flex items-center gap-2">
                                            {getProductQuantity(product.id) > 0 && (
                                                <button
                                                    onClick={() => handleRemoveFromCart(product.id)}
                                                    className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-red-500 transition-colors border border-slate-200 dark:border-slate-600 active:scale-90"
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>remove</span>
                                                </button>
                                            )}
                                            <button
                                                disabled={product.availableStock === 0}
                                                onClick={() => handleAddToCart(product.id)}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform ${product.availableStock === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-primary text-slate-900'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Product Grid */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {searchQuery ? 'Resultados de búsqueda' : selectedCategory === 'Todo' && !searchQuery && maxPrice >= 9999999 && selectedBadges.length === 0 ? 'Productos más vendidos' : selectedCategory === 'Todo' ? 'Todos los Productos' : selectedCategory}
                        </h3>
                        <span className="text-xs text-slate-400 font-medium">{filteredProducts.length} productos</span>
                    </div>

                    {state.isLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 text-left">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm animate-pulse space-y-3">
                                    <div className="aspect-square bg-slate-200 dark:bg-slate-700 rounded-xl" />
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                                    <div className="flex justify-between items-center pt-2">
                                        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                                        <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 text-left">
                            {filteredProducts.map((product: Product) => (
                                <div key={product.id} className="group relative bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <Link to={`/product/${product.id}`} className="block">
                                        <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-sage-light/20">

                                            {product.availableStock === 0 && (
                                                <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-bold z-10">AGOTADO</span>
                                            )}
                                            {getProductQuantity(product.id) > 0 && (
                                                <span className="absolute top-2 right-2 bg-primary text-slate-900 text-[10px] font-black px-2 py-1 rounded-lg z-10 shadow-lg ring-1 ring-black/5">
                                                    EN CARRITO: {formatWeight(getProductQuantity(product.id), product.isFractional)}
                                                </span>
                                            )}
                                            <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-700 mb-3">
                                                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                                                    {product.badges?.filter(b => ['Sin TACC', 'Vegano', 'Sin Azúcar', 'Orgánico', 'Keto'].includes(b)).map(tag => (
                                                        <span key={tag} className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-slate-800 dark:text-slate-200 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 uppercase tracking-tighter">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleToggleFavorite(product.id);
                                                }}
                                                className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-sm backdrop-blur transition-all ${state.favorites.includes(product.id)
                                                    ? 'bg-primary text-slate-900'
                                                    : 'bg-white/90 dark:bg-slate-900/90 text-slate-400'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: state.favorites.includes(product.id) ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                                            </button>
                                        </div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1 truncate">{product.name}</h4>
                                    </Link>
                                    <p className="text-xs text-sage mb-2 text-left">{formatWeight(1, product.isFractional)} • <span className={product.availableStock > 0 ? 'text-green-600' : 'text-red-500'}>{formatWeight(product.availableStock, product.isFractional)} disp.</span></p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-base font-bold text-slate-900 dark:text-white">${product.price.toFixed(2)}</span>
                                        <div className="flex items-center gap-2">
                                            {getProductQuantity(product.id) > 0 && (
                                                <button
                                                    onClick={() => handleRemoveFromCart(product.id)}
                                                    className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-red-500 transition-colors border border-slate-200 dark:border-slate-600 active:scale-90"
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>remove</span>
                                                </button>
                                            )}
                                            <button
                                                disabled={product.availableStock === 0}
                                                onClick={() => handleAddToCart(product.id)}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform ${product.availableStock === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-primary text-slate-900'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                            <span className="material-symbols-outlined text-6xl mb-4">search_off</span>
                            <p className="text-sm font-medium">No encontramos productos que coincidan.</p>
                        </div>
                    )}
                </section>

                {/* Categories Preview (if in 'Todo') */}
                {selectedCategory === 'Todo' && !searchQuery && (
                    <section className="pb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{state.promotions.featured.sectionTitle}</h3>
                        <div className="bg-sage-light dark:bg-slate-800 rounded-3xl p-4 flex items-center gap-4 text-left">
                            <div className="w-20 h-20 flex-shrink-0 overflow-hidden p-2 flex items-center justify-center">
                                <img alt={state.promotions.featured.itemTitle} className="w-full h-full object-contain" src={state.promotions.featured.itemImage} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-900 dark:text-white text-base">{state.promotions.featured.itemTitle}</h4>
                                <p className="text-xs text-sage-700 dark:text-white/70 mt-1 mb-2">{state.promotions.featured.itemDescription}</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-primary-dark dark:text-primary font-extrabold text-lg">${state.promotions.featured.price.toFixed(2)}</span>
                                    {state.promotions.featured.oldPrice > 0 && (
                                        <span className="text-slate-400 text-sm line-through">${state.promotions.featured.oldPrice.toFixed(2)}</span>
                                    )}
                                </div>
                            </div>
                            <button className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-slate-900 shadow-sm active:scale-90 transition-transform">
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                        </div>
                    </section>
                )}

                {/* Suggestions Section */}
                {selectedCategory === 'Todo' && !searchQuery && (
                    <SuggestionBox />
                )}
            </main>

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 w-full bg-white/90 dark:bg-background-dark/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 pb-safe pt-2 z-50">
                <div className="flex justify-around items-center px-2 h-16">
                    <Link to="/shop" className="flex flex-col items-center justify-center gap-1 w-16 group">
                        <div className={`relative p-1.5 rounded-xl transition-colors ${selectedCategory === 'Todo' && !searchQuery ? 'bg-primary/20' : 'group-hover:bg-slate-50 dark:group-hover:bg-slate-800'}`}>
                            <span className={`material-symbols-outlined ${selectedCategory === 'Todo' && !searchQuery ? 'text-slate-900 dark:text-primary' : 'text-sage group-hover:text-slate-900 dark:group-hover:text-white'}`} style={{ fontSize: '24px', fontVariationSettings: selectedCategory === 'Todo' && !searchQuery ? "'FILL' 1" : "'FILL' 0" }}>home</span>
                        </div>
                        <span className={`text-[10px] font-bold ${selectedCategory === 'Todo' && !searchQuery ? 'text-slate-900 dark:text-primary' : 'text-sage group-hover:text-slate-900 dark:group-hover:text-white'}`}>Inicio</span>
                    </Link>
                    <Link to="/catalog" className="flex flex-col items-center justify-center gap-1 w-16 group text-sage hover:text-slate-900 dark:hover:text-white transition-colors">
                        <div className="relative p-1.5 rounded-xl group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>manage_search</span>
                        </div>
                        <span className="text-[10px] font-medium">Catálogo</span>
                    </Link>
                    <Link to="/my-orders" className="flex flex-col items-center justify-center gap-1 w-16 group text-sage hover:text-slate-900 dark:hover:text-white transition-colors">
                        <div className="relative p-1.5 rounded-xl group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>assignment</span>
                        </div>
                        <span className="text-[10px] font-medium">Pedidos</span>
                    </Link>
                    <Link to="/profile" className="flex flex-col items-center justify-center gap-1 w-16 group text-sage hover:text-slate-900 dark:hover:text-white transition-colors">
                        <div className="relative p-1.5 rounded-xl group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>person</span>
                        </div>
                        <span className="text-[10px] font-medium">Perfil</span>
                    </Link>
                </div>
            </nav>

            <FilterModal
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                maxPrice={maxPrice}
                setMaxPrice={setMaxPrice}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedBadges={selectedBadges}
                setSelectedBadges={setSelectedBadges}
                categories={categories}
                onApply={() => { }}
            />
            <Toast
                message={toastMessage}
                isVisible={showToast}
                onClose={() => setShowToast(false)}
            />
        </div>
    );
};

export default Home;
