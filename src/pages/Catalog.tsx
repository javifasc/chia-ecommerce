import { useState, useMemo, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import { CATEGORIES_MAP } from '../utils/categoryMapping';
import { Link } from 'react-router-dom';
import FilterModal from '../components/FilterModal';
import Toast from '../components/Toast';

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
    const { state, dispatch, formatWeight } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('Todo');
    const [activeSubcategory, setActiveSubcategory] = useState('Todo');
    const [maxPrice, setMaxPrice] = useState(9999999);
    const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);

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
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen pb-24 relative selection:bg-primary italic-none">
            {/* Search Header */}
            <header className="sticky top-0 z-50 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-5 pt-12 pb-4">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Explorar</h1>
                    <Link to="/cart" className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                        <span className="material-symbols-outlined text-slate-800 dark:text-white">shopping_cart</span>
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[10px] font-bold text-slate-900 flex items-center justify-center rounded-full">
                                {cartCount}
                            </span>
                        )}
                    </Link>
                </div>

                <div className="relative flex gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                        <input
                            type="text"
                            placeholder="¿Qué buscas hoy?"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all ${maxPrice < 100 ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                    >
                        <span className="material-symbols-outlined">tune</span>
                    </button>
                </div>
            </header>

            <main className="px-5 py-2 space-y-8 text-left">
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
                                            <span className="material-symbols-outlined text-primary-dark dark:text-primary text-2xl">{cat.icon}</span>
                                            <span className="text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-tight text-center leading-tight">{cat.name}</span>
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
                                        className={`flex-none px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all ${activeSubcategory === sub
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
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filteredProducts.length} items</span>
                    </div>

                    {filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filteredProducts.map((p: Product) => (
                                <div key={p.id} className="bg-white dark:bg-slate-800 rounded-3xl p-3 shadow-sm border border-slate-50 dark:border-slate-700 relative group text-left">
                                    <Link to={`/product/${p.id}`} className="block">
                                        <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-700 mb-3">
                                            {getProductQuantity(p.id) > 0 && (
                                                <span className="absolute top-2 right-2 bg-primary text-slate-900 text-[10px] font-black px-2 py-1 rounded-lg z-10 shadow-lg ring-1 ring-black/5">
                                                    EN CARRITO: {formatWeight(getProductQuantity(p.id), p.isFractional)}
                                                </span>
                                            )}
                                            <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                                                {p.badges?.filter(b => ['Sin TACC', 'Vegano', 'Sin Azúcar', 'Orgánico', 'Keto'].includes(b)).map(tag => (
                                                    <span key={tag} className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-slate-800 dark:text-slate-200 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 uppercase tracking-tighter">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleToggleFavorite(p.id);
                                                }}
                                                className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur shadow-sm transition-all ${state.favorites.includes(p.id) ? 'bg-primary text-slate-900' : 'bg-white/80 dark:bg-slate-900/80 text-slate-400'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: state.favorites.includes(p.id) ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                                            </button>
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate mb-1">{p.name}</h3>
                                    </Link>
                                    <p className="text-[10px] text-slate-400 font-medium mb-3">{p.unit}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-base font-bold text-slate-900 dark:text-white">${p.price.toFixed(2)}</span>
                                        <div className="flex items-center gap-2">
                                            {getProductQuantity(p.id) > 0 && (
                                                <button
                                                    onClick={() => handleRemoveFromCart(p.id)}
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors active:scale-90"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">remove</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleAddToCart(p.id)}
                                                disabled={p.availableStock === 0}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm active:scale-90 transition-all ${p.availableStock === 0 ? 'bg-slate-100 text-slate-300' : 'bg-primary text-slate-900 shadow-primary/20 hover:shadow-primary/40'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined font-bold">add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30">
                            <span className="material-symbols-outlined text-6xl mb-4">sentiment_dissatisfied</span>
                            <p className="text-sm font-medium">No se encontraron productos.</p>
                        </div>
                    )}
                </section>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 w-full bg-white/90 dark:bg-background-dark/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 pb-safe pt-2 z-50">
                <div className="flex justify-around items-center px-2 h-16">
                    <Link to="/shop" className="flex flex-col items-center justify-center gap-1 w-16 group text-sage">
                        <div className="relative p-1.5 rounded-xl transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>home</span>
                        </div>
                        <span className="text-[10px] font-medium">Inicio</span>
                    </Link>
                    <Link to="/catalog" className="flex flex-col items-center justify-center gap-1 w-16 group text-slate-900 dark:text-primary">
                        <div className="relative p-1.5 rounded-xl bg-primary/20 transition-colors border border-primary/10">
                            <span className="material-symbols-outlined" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>manage_search</span>
                        </div>
                        <span className="text-[10px] font-bold">Catálogo</span>
                    </Link>
                    <Link to="/my-orders" className="flex flex-col items-center justify-center gap-1 w-16 group text-sage">
                        <div className="relative p-1.5 rounded-xl group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>assignment</span>
                        </div>
                        <span className="text-[10px] font-medium">Pedidos</span>
                    </Link>
                    <Link to="/profile" className="flex flex-col items-center justify-center gap-1 w-16 group text-sage hover:text-slate-900 dark:hover:text-white transition-colors">
                        <div className="relative p-1.5 rounded-xl group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>person</span>
                        </div>
                        <span className="text-[10px] font-bold">Perfil</span>
                    </Link>
                </div>
            </nav>

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
