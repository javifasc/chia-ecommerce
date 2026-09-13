import { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import { CATEGORIES_MAP } from '../utils/categoryMapping';
import { Link } from 'react-router-dom';
import FilterModal from '../components/FilterModal';
import Toast from '../components/Toast';
import BottomNav from '../components/BottomNav';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';

const PAGE_SIZE = 24;

const CATEGORY_ICONS: Record<string, string> = {
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

const Catalog = () => {
    const { state } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('Todo');
    const [activeSubcategory, setActiveSubcategory] = useState('Todo');
    const [maxPrice, setMaxPrice] = useState(9999999);
    const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const categories = useMemo(() => {
        const cats = Object.keys(CATEGORIES_MAP).map(name => ({
            name,
            icon: CATEGORY_ICONS[name] || 'folder_open',
        }));
        return [{ name: 'Todo', icon: 'apps' }, ...cats];
    }, []);

    const filteredProducts = useMemo(() => {
        return state.products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'Todo' || p.category === activeCategory;
            const matchesSubcategory = activeSubcategory === 'Todo' || p.subcategory === activeSubcategory;
            const matchesPrice = p.price <= maxPrice;
            const matchesBadges = selectedBadges.length === 0 ||
                selectedBadges.every(badge => p.badges?.includes(badge));
            const hasStock = p.availableStock > 0;
            return matchesSearch && matchesCategory && matchesSubcategory && matchesPrice && matchesBadges && hasStock;
        });
    }, [state.products, searchQuery, activeCategory, activeSubcategory, maxPrice, selectedBadges]);

    const cartCount = state.cart.reduce((sum, item) => {
        const product = state.products.find(p => p.id === item.productId);
        return sum + (product?.isFractional ? 1 : item.quantity);
    }, 0);

    const notifyAdded = () => {
        setToastMessage('¡Añadido al carrito!');
        setShowToast(true);
    };

    // Al cambiar de filtro volvemos a la primera tanda de resultados.
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [searchQuery, activeCategory, activeSubcategory, maxPrice, selectedBadges]);

    const visibleProducts = filteredProducts.slice(0, visibleCount);
    const hasMore = filteredProducts.length > visibleCount;
    const activeFilterCount = (maxPrice < 9999999 ? 1 : 0) + selectedBadges.length;

    const gridClass = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4';

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
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen pb-24 relative selection:bg-primary not-italic">
            {/* Search Header */}
            <header className="sticky top-0 z-40 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-5 pt-safe pb-4">
                <div className="max-w-7xl mx-auto pt-4">
                <div className="flex items-center justify-between mb-5">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Explorar</h1>
                    <Link to="/cart" aria-label={cartCount > 0 ? `Carrito, ${cartCount} productos` : 'Carrito, vacío'} className="relative w-11 h-11 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform">
                        <span aria-hidden="true" className="material-symbols-outlined text-slate-800 dark:text-white">shopping_cart</span>
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-primary text-[11px] font-bold text-slate-900 flex items-center justify-center rounded-full ring-2 ring-background-light dark:ring-background-dark">
                                {cartCount}
                            </span>
                        )}
                    </Link>
                </div>

                <div className="relative flex gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                        <label htmlFor="catalog-search" className="sr-only">Buscar productos</label>
                        <input
                            id="catalog-search"
                            type="search"
                            placeholder="¿Qué buscas hoy?"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                        />
                    </div>
                    <button
                        type="button"
                        aria-label={activeFilterCount > 0 ? `Filtros, ${activeFilterCount} activos` : 'Abrir filtros'}
                        onClick={() => setIsFilterOpen(true)}
                        className={`relative w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-2xl transition-all ${activeFilterCount > 0 ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                    >
                        <span aria-hidden="true" className="material-symbols-outlined">tune</span>
                    </button>
                </div>
                </div>
            </header>

            <main className="px-5 py-2 space-y-8 text-left max-w-7xl mx-auto w-full">
                {/* Visual Category Grid */}
                {!searchQuery && activeCategory === 'Todo' && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Categorías</h2>
                        <div className="grid grid-cols-3 gap-3">
                            {categories.slice(1).map((cat) => (
                                <div key={cat.name} className="relative group">
                                    <button
                                        onClick={() => {
                                            setActiveCategory(cat.name);
                                            setActiveSubcategory('Todo');
                                        }}
                                        className="relative w-full h-24 rounded-2xl overflow-hidden shadow-sm active:scale-95 transition-transform bg-gradient-to-br from-primary/20 to-primary/5 dark:from-primary/10 dark:to-slate-800 border border-primary/10 dark:border-slate-700"
                                    >
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 gap-1">
                                            <span aria-hidden="true" className="material-symbols-outlined text-primary-dark dark:text-primary text-2xl">{cat.icon}</span>
                                            <span className="text-slate-700 dark:text-slate-300 text-[11px] font-bold uppercase tracking-tight text-center leading-tight">{cat.name}</span>
                                        </div>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Category Tabs (Show when filtering or searching) */}
                {(searchQuery || activeCategory !== 'Todo') && (
                    <div className="flex flex-col gap-2 -mx-5 px-5">
                        <div
                            ref={categoryScrollRef}
                            {...catScrollHandlers}
                            className="flex gap-2 overflow-x-auto no-scrollbar py-2 cursor-grab active:cursor-grabbing select-none"
                        >
                            {categories.map((cat) => (
                                <button
                                    key={cat.name}
                                    onClick={() => {
                                        setActiveCategory(cat.name);
                                        setActiveSubcategory('Todo');
                                    }}
                                    className={`flex-none px-5 py-2.5 rounded-full text-xs font-bold transition-all ${activeCategory === cat.name
                                        ? 'bg-primary text-slate-900 shadow-md shadow-primary/20'
                                        : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700'
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>

                        {/* Subcategory Tabs */}
                        {activeCategory !== 'Todo' && (
                            <div
                                ref={subcategoryScrollRef}
                                {...subScrollHandlers}
                                className="flex gap-2 overflow-x-auto no-scrollbar py-1 cursor-grab active:cursor-grabbing select-none border-t border-slate-100 dark:border-slate-800 pt-2"
                            >
                                {['Todo', ...(CATEGORIES_MAP[activeCategory] || [])].map((sub) => (
                                    <button
                                        key={sub}
                                        onClick={() => setActiveSubcategory(sub)}
                                        className={`flex-none px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all ${activeSubcategory === sub
                                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                                            }`}
                                    >
                                        {sub}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Dynamic Product Grid */}
                <section className="pb-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold">
                            {activeCategory === 'Todo' ? 'Todos los Productos' : activeCategory}
                        </h2>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{filteredProducts.length} items</span>
                    </div>

                    {state.isLoading ? (
                        <div className={gridClass}>
                            {[...Array(6)].map((_, i) => <ProductCardSkeleton key={i} />)}
                        </div>
                    ) : filteredProducts.length > 0 ? (
                        <>
                            <div className={gridClass}>
                                {visibleProducts.map((p: Product, i: number) => (
                                    <ProductCard key={p.id} product={p} eager={i < 4} onAdded={notifyAdded} />
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
                            <span aria-hidden="true" className="material-symbols-outlined text-6xl mb-4 text-slate-300 dark:text-slate-600">sentiment_dissatisfied</span>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">No se encontraron productos.</p>
                            {(searchQuery || activeCategory !== 'Todo' || activeFilterCount > 0) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setActiveCategory('Todo');
                                        setActiveSubcategory('Todo');
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
            </main>

            <BottomNav />

            <FilterModal
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                maxPrice={maxPrice}
                setMaxPrice={setMaxPrice}
                selectedCategory={activeCategory}
                setSelectedCategory={setActiveCategory}
                selectedBadges={selectedBadges}
                setSelectedBadges={setSelectedBadges}
                categories={categories.map(c => c.name)}
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

export default Catalog;
