import { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import { CATEGORIES_MAP } from '../utils/categoryMapping';
import { Link } from 'react-router-dom';
import FilterModal from '../components/FilterModal';
import Toast from '../components/Toast';
import SuggestionBox from '../components/SuggestionBox';
import BottomNav from '../components/BottomNav';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';

const PAGE_SIZE = 24;

const Home = () => {
    const { state } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todo');
    const [selectedSubcategory, setSelectedSubcategory] = useState('Todo');
    const [maxPrice, setMaxPrice] = useState(9999999);
    const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

    // Al cambiar de filtro volvemos a la primera tanda de resultados.
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [searchQuery, selectedCategory, selectedSubcategory, maxPrice, selectedBadges]);

    const visibleProducts = filteredProducts.slice(0, visibleCount);
    const hasMore = filteredProducts.length > visibleCount;

    const newArrivals = useMemo(() => {
        return state.products.filter(p => p.isNewArrival && p.availableStock > 0);
    }, [state.products]);

    const cartCount = state.cart.reduce((sum, item) => {
        const product = state.products.find(p => p.id === item.productId);
        return sum + (product?.isFractional ? 1 : item.quantity);
    }, 0);

    const notifyAdded = () => {
        setToastMessage('¡Añadido al carrito!');
        setShowToast(true);
    };

    const activeFilterCount = (maxPrice < 9999999 ? 1 : 0) + selectedBadges.length;

    // La barra de filtros se pega justo debajo del header: medimos su alto real
    // en vez de arrastrar un offset fijo que se desalinea al cambiar el contenido.
    const headerRef = useRef<HTMLElement>(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    useEffect(() => {
        const el = headerRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => setHeaderHeight(el.offsetHeight));
        observer.observe(el);
        setHeaderHeight(el.offsetHeight);
        return () => observer.disconnect();
    }, []);

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

    const gridClass = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 text-left';

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen pb-28 relative selection:bg-primary selection:text-slate-900">
            {/* Top Bar */}
            <header ref={headerRef} className="sticky top-0 z-40 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-5 pt-safe">
                <div className="max-w-7xl mx-auto pt-4 pb-3">
                    <div className="flex items-center justify-between mb-3">
                        <Link to="/" className="flex items-center gap-2.5" aria-label="#CHIA, ir al inicio">
                            <img
                                alt=""
                                className="w-11 h-11 object-contain"
                                src="/logo.png"
                                onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                            />
                            <div>
                                <p className="text-[11px] text-primary-dark dark:text-primary font-semibold uppercase tracking-widest leading-none mb-1">
                                    Almacén Natural
                                </p>
                                <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-none">#CHIA</h1>
                            </div>
                        </Link>
                        <Link
                            to="/cart"
                            aria-label={cartCount > 0 ? `Carrito, ${cartCount} productos` : 'Carrito, vacío'}
                            className="relative w-11 h-11 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform"
                        >
                            <span aria-hidden="true" className="material-symbols-outlined text-slate-800 dark:text-white" style={{ fontSize: '20px' }}>shopping_cart</span>
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-primary text-[11px] font-bold text-slate-900 flex items-center justify-center rounded-full ring-2 ring-background-light dark:ring-background-dark">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <label htmlFor="home-search" className="sr-only">Buscar productos</label>
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <span aria-hidden="true" className="material-symbols-outlined text-slate-400" style={{ fontSize: '20px' }}>search</span>
                        </div>
                        <input
                            id="home-search"
                            className="block w-full pl-11 pr-14 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm placeholder:text-slate-400 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary shadow-sm"
                            placeholder="Buscar productos saludables..."
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
                            <button
                                type="button"
                                aria-label={activeFilterCount > 0 ? `Filtros, ${activeFilterCount} activos` : 'Abrir filtros'}
                                onClick={() => setIsFilterOpen(true)}
                                className={`relative rounded-lg p-2 transition-colors ${activeFilterCount > 0 ? 'bg-primary text-slate-900' : 'bg-primary/15 hover:bg-primary/30 text-slate-700 dark:text-slate-200'}`}
                            >
                                <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '18px' }}>tune</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Scrollable */}
            <main className="flex flex-col gap-6 px-5 pt-2 max-w-7xl mx-auto w-full">
                {/* Filters Section */}
                <div
                    style={{ top: headerHeight }}
                    className="flex flex-col gap-1 sticky z-30 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md -mx-5 px-5 pb-2 border-b border-slate-100 dark:border-slate-800"
                >
                    {/* Category Navigation */}
                    <div
                        ref={categoryScrollRef}
                        {...catScrollHandlers}
                        className="w-full overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none"
                        role="tablist"
                        aria-label="Categorías"
                    >
                        <div className="flex gap-2.5 min-w-max py-2">
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
                                const isActive = selectedCategory === cat;
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => {
                                            setSelectedCategory(cat);
                                            setSelectedSubcategory('Todo');
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm transition-all active:scale-95 whitespace-nowrap ${isActive
                                            ? 'bg-primary text-slate-900 font-bold shadow-sm'
                                            : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium'
                                            }`}
                                    >
                                        <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '18px' }}>
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
                                        type="button"
                                        aria-pressed={selectedSubcategory === sub}
                                        onClick={() => setSelectedSubcategory(sub)}
                                        className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all active:scale-95 whitespace-nowrap ${selectedSubcategory === sub
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
                    <Link
                        to="/catalog"
                        className="relative w-full rounded-2xl overflow-hidden aspect-[16/9] sm:aspect-[21/9] shadow-lg group block"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent z-10" />
                        <img
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            src={state.promotions.hero.image}
                            loading="eager"
                            decoding="async"
                        />
                        <div className="absolute bottom-0 left-0 p-5 sm:p-6 z-20 w-full sm:w-3/4 text-left">
                            <span className="inline-block px-3 py-1 bg-primary text-slate-900 text-[11px] font-bold rounded-lg mb-2 uppercase tracking-wide">
                                {state.promotions.hero.tag}
                            </span>
                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1.5 leading-tight">{state.promotions.hero.title}</h2>
                            <p className="text-white/90 text-sm mb-4 font-medium line-clamp-2">{state.promotions.hero.description}</p>
                            <span className="bg-white text-slate-900 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm group-active:scale-95 transition-transform inline-flex items-center gap-2">
                                {state.promotions.hero.buttonText}
                                <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                            </span>
                        </div>
                    </Link>
                )}

                {/* New Arrivals Section */}
                {selectedCategory === 'Todo' && !searchQuery && newArrivals.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span aria-hidden="true" className="material-symbols-outlined text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Novedades</h2>
                            </div>
                            <span className="text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-lg uppercase tracking-wide">
                                Lo nuevo
                            </span>
                        </div>
                        <div className={gridClass}>
                            {newArrivals.map((product: Product, i: number) => (
                                <ProductCard key={product.id} product={product} showStock eager={i < 4} onAdded={notifyAdded} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Product Grid */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            {searchQuery ? 'Resultados de búsqueda' : selectedCategory === 'Todo' && !searchQuery && maxPrice >= 9999999 && selectedBadges.length === 0 ? 'Productos más vendidos' : selectedCategory === 'Todo' ? 'Todos los Productos' : selectedCategory}
                        </h2>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
                        </span>
                    </div>

                    {state.isLoading ? (
                        <div className={gridClass}>
                            {[...Array(6)].map((_, i) => <ProductCardSkeleton key={i} />)}
                        </div>
                    ) : filteredProducts.length > 0 ? (
                        <>
                            <div className={gridClass}>
                                {visibleProducts.map((product: Product, i: number) => (
                                    <ProductCard key={product.id} product={product} showStock eager={i < 4} onAdded={notifyAdded} />
                                ))}
                            </div>
                            {hasMore && (
                                <div className="flex justify-center mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                                        className="px-6 py-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold shadow-sm hover:border-primary active:scale-95 transition-all"
                                    >
                                        Ver más productos ({filteredProducts.length - visibleCount} restantes)
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <span aria-hidden="true" className="material-symbols-outlined text-6xl mb-4 text-slate-300 dark:text-slate-600">search_off</span>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">No encontramos productos que coincidan.</p>
                            {(searchQuery || selectedCategory !== 'Todo' || activeFilterCount > 0) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedCategory('Todo');
                                        setSelectedSubcategory('Todo');
                                        setMaxPrice(9999999);
                                        setSelectedBadges([]);
                                    }}
                                    className="px-5 py-2.5 rounded-full bg-primary text-slate-900 text-sm font-bold active:scale-95 transition-transform"
                                >
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    )}
                </section>

                {/* Categories Preview (if in 'Todo') */}
                {selectedCategory === 'Todo' && !searchQuery && (
                    <section>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{state.promotions.featured.sectionTitle}</h2>
                        <Link
                            to="/catalog"
                            className="bg-sage-light dark:bg-slate-800 rounded-2xl p-4 flex items-center gap-4 text-left hover:shadow-md transition-shadow group"
                        >
                            <div className="w-20 h-20 flex-shrink-0 overflow-hidden p-2 flex items-center justify-center">
                                <img
                                    alt=""
                                    className="w-full h-full object-contain"
                                    src={state.promotions.featured.itemImage}
                                    loading="lazy"
                                    decoding="async"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">{state.promotions.featured.itemTitle}</h3>
                                <p className="text-xs text-slate-600 dark:text-white/70 mt-1 mb-2 line-clamp-2">{state.promotions.featured.itemDescription}</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-primary-dark dark:text-primary font-bold text-lg">${state.promotions.featured.price.toFixed(2)}</span>
                                    {state.promotions.featured.oldPrice > 0 && (
                                        <span className="text-slate-500 dark:text-slate-400 text-sm line-through">${state.promotions.featured.oldPrice.toFixed(2)}</span>
                                    )}
                                </div>
                            </div>
                            <span className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-slate-900 shadow-sm group-active:scale-90 transition-transform flex-shrink-0">
                                <span aria-hidden="true" className="material-symbols-outlined">arrow_forward</span>
                            </span>
                        </Link>
                    </section>
                )}

                {/* Suggestions Section */}
                {selectedCategory === 'Todo' && !searchQuery && (
                    <SuggestionBox />
                )}
            </main>

            <BottomNav />

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
