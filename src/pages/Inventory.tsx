import { useState, useMemo, useRef, useCallback } from 'react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES_MAP } from '../utils/categoryMapping';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { parseStockXLSX, ParseResult } from '../utils/xlsxParser';

const Inventory = () => {
    const { state, deleteProduct, updateStock, importStockFile, formatWeight, toggleNewArrival, refreshProducts } = useStore();
    const { showToast, showConfirm } = useNotifications();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('Todo');
    const [selectedSubcategory, setSelectedSubcategory] = useState('Todo');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterNewArrivals, setFilterNewArrivals] = useState(false);

    // Import modal state
    const [showImport, setShowImport] = useState(false);
    const [importData, setImportData] = useState<ParseResult | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importResult, setImportResult] = useState<{ updated: number; created: number; errors: string[] } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const categories = useMemo(() => {
        return ['Todo', ...Object.keys(CATEGORIES_MAP)];
    }, []);

    const filteredAndGroupedProducts = useMemo(() => {
        let filtered = state.products;

        // Apply Search Filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.codigo?.toLowerCase().includes(query)
            );
        }

        // Apply Category Filter
        if (selectedCategory !== 'Todo') {
            filtered = filtered.filter(p => p.category === selectedCategory);
        }

        // Apply Subcategory Filter
        if (selectedSubcategory !== 'Todo') {
            filtered = filtered.filter(p => p.subcategory === selectedSubcategory);
        }

        // Apply New Arrivals Filter
        if (filterNewArrivals) {
            filtered = filtered.filter(p => p.isNewArrival);
        }

        // Group by category
        const groups: { [key: string]: typeof state.products } = {};
        filtered.forEach(p => {
            if (!groups[p.category]) groups[p.category] = [];
            groups[p.category].push(p);
        });

        return groups;
    }, [state.products, selectedCategory, selectedSubcategory, searchQuery, filterNewArrivals]);

    // Custom hook-like logic for drag-to-scroll
    const setupScroll = (ref: React.RefObject<HTMLDivElement>) => {
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

    const categoryScrollRef = useRef<HTMLDivElement>(null);
    const subcategoryScrollRef = useRef<HTMLDivElement>(null);
    const categoryScrollHandlers = setupScroll(categoryScrollRef);
    const subcategoryScrollHandlers = setupScroll(subcategoryScrollRef);

    const handleAdjustStock = async (productId: string, isAddition: boolean) => {
        try {
            const product = state.products.find(p => p.id === productId);
            if (!product) return;

            const increment = product.isFractional ? ((product.fractionalStep || 0) / 1000) : 1;
            const adjustment = isAddition ? increment : -increment;

            await updateStock(productId, adjustment);
            const action = isAddition ? 'añadido' : 'quitado';
            showToast(`Stock de ${product.name} ${action} correctamente.`, 'info');
        } catch (error) {
            console.error('Error adjusting stock:', error);
            showToast('Error al ajustar el stock', 'error');
        }
    };

    const handleDeleteProduct = (productId: string, productName: string) => {
        showConfirm({
            title: '¿Borrar Producto?',
            message: `¿Estás seguro de que quieres eliminar "${productName}"? Esta acción no se puede deshacer.`,
            confirmText: 'Borrar',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await deleteProduct(productId);
                    showToast(`"${productName}" ha sido eliminado.`, 'success');
                } catch (error) {
                    console.error('Error deleting product:', error);
                    showToast('Error al eliminar el producto', 'error');
                }
            }
        });
    };

    const totalItems = state.products.length;
    const lowStockCount = state.products.filter(p => p.availableStock < 5 && p.availableStock > 0).length;
    const outOfStockCount = state.products.filter(p => p.availableStock === 0).length;

    // --- Import handlers ---
    const handleFileSelected = useCallback(async (file: File) => {
        try {
            const result = await parseStockXLSX(file);
            setImportData(result);
            setImportResult(null);
            if (result.rows.length === 0) {
                showToast('El archivo no contiene datos válidos.', 'error');
            }
        } catch (err: any) {
            showToast(err.message || 'Error al leer el archivo', 'error');
        }
    }, [showToast]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelected(file);
    }, [handleFileSelected]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => setIsDragging(false), []);

    const handleImport = async () => {
        if (!importData) return;
        setIsImporting(true);
        setImportProgress(0);
        try {
            const result = await importStockFile(
                importData.rows.map(r => ({
                    codigo: r.codigo,
                    nombre: r.nombre,
                    familia: r.familia,
                    stock: r.stock,
                    ventaValorizada: r.ventaValorizada
                })),
                (percent) => {
                    setImportProgress(percent);
                }
            );
            setImportResult(result);
            showToast(`Importación completa: ${result.updated} actualizados, ${result.created} nuevos.`, 'success');
        } catch (err: any) {
            showToast('Error durante la importación: ' + (err.message || ''), 'error');
        } finally {
            setIsImporting(false);
        }
    };

    const closeImportModal = () => {
        if (isImporting) return; // Prevent closing while importing
        setShowImport(false);
        setImportData(null);
        setImportResult(null);
        setIsDragging(false);
        setImportProgress(0);
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display antialiased text-slate-900 dark:text-slate-100 overflow-x-hidden transition-colors duration-200 min-h-screen pb-24 relative italic-none">
            <header className="sticky top-0 z-20 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 pt-6 pb-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link to="/admin" className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <h1 className="text-xl font-bold flex-1 text-center"><span className="text-primary mr-1">#CHIA</span> Inventario</h1>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={async () => {
                                setIsRefreshing(true);
                                try {
                                    await refreshProducts();
                                } finally {
                                    setIsRefreshing(false);
                                }
                            }}
                            className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${isRefreshing ? 'animate-spin text-primary' : 'text-slate-400'}`}
                            title="Refrescar datos"
                        >
                            <span className="material-symbols-outlined">refresh</span>
                        </button>
                        <button
                            onClick={() => setShowImport(true)}
                            className="p-2 -mr-2 rounded-full hover:bg-primary/10 text-primary transition-colors relative group"
                            title="Importar stock desde archivo"
                        >
                            <span className="material-symbols-outlined">upload_file</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8 text-left">
                {/* Quick Stats - Responsive Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-400 text-lg">inventory</span>
                            </div>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total</p>
                        </div>
                        <p className="text-3xl font-black">{totalItems}</p>
                    </div>
                    <div className="p-5 bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-orange-500 text-lg">warning</span>
                            </div>
                            <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest">Stock Bajo</p>
                        </div>
                        <p className="text-3xl font-black text-orange-500">{lowStockCount}</p>
                    </div>
                    <div className="p-5 bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-red-500 text-lg">error</span>
                            </div>
                            <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">Agotado</p>
                        </div>
                        <p className="text-3xl font-black text-red-500">{outOfStockCount}</p>
                    </div>
                </div>

                <div className="flex items-end gap-3">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input
                            type="text"
                            placeholder="Buscar por nombre o código..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all italic-none"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        )}
                    </div>

                    {/* New Arrivals Filter Toggle */}
                    <button
                        onClick={() => setFilterNewArrivals(!filterNewArrivals)}
                        className={`h-[56px] px-5 rounded-2xl border flex items-center gap-2 transition-all active:scale-95 ${filterNewArrivals ? 'bg-amber-100 border-amber-200 text-amber-600 shadow-sm shadow-amber-200/50' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-slate-800 text-slate-400'}`}
                        title="Ver solo novedades"
                    >
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: filterNewArrivals ? "'FILL' 1" : "'FILL' 0" }}>{filterNewArrivals ? 'star' : 'star_outline'}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Novedades</span>
                    </button>
                </div>

                {/* Filters Section */}
                <div className="space-y-2 sticky top-[73px] z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md -mx-4 px-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                    {/* Category Filters */}
                    <div
                        ref={categoryScrollRef}
                        {...categoryScrollHandlers}
                        className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 cursor-grab active:cursor-grabbing select-none"
                    >
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => {
                                    setSelectedCategory(cat);
                                    setSelectedSubcategory('Todo');
                                }}
                                className={`
                                    whitespace-nowrap px-5 py-2 rounded-full text-xs font-black transition-all active:scale-95
                                    ${selectedCategory === cat
                                        ? 'bg-primary text-slate-900 shadow-md shadow-primary/20'
                                        : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-100 dark:border-slate-700'}
                                `}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Subcategory Filters */}
                    {selectedCategory !== 'Todo' && (
                        <div
                            ref={subcategoryScrollRef}
                            {...subcategoryScrollHandlers}
                            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 cursor-grab active:cursor-grabbing select-none"
                        >
                            {['Todo', ...(CATEGORIES_MAP[selectedCategory] || [])].map(sub => (
                                <button
                                    key={sub}
                                    onClick={() => setSelectedSubcategory(sub)}
                                    className={`
                                        whitespace-nowrap px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all active:scale-95
                                        ${selectedSubcategory === sub
                                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                            : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}
                                    `}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Inventory List - Categorized */}
                <div className="space-y-10">
                    {Object.entries(filteredAndGroupedProducts).length > 0 ? (
                        Object.entries(filteredAndGroupedProducts).map(([category, products]) => (
                            <div key={category} className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200">{category}</h2>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400">{products.length} {products.length === 1 ? 'ítem' : 'ítems'}</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {products.map((product) => (
                                        <div key={product.id} className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-in fade-in slide-in-from-bottom duration-300 group hover:border-primary/30 transition-all">
                                            <div className="h-24 w-24 sm:h-20 sm:w-20 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 shadow-inner">
                                                <img alt={product.name} src={product.image} className="object-cover h-full w-full group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                            <div className="flex-1 min-w-0 w-full text-left">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate text-sm">{product.name}</h3>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            onClick={() => toggleNewArrival(product.id)}
                                                            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${product.isNewArrival ? 'bg-amber-100 text-amber-500 hover:bg-amber-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}
                                                            title={product.isNewArrival ? 'Quitar de Novedades' : 'Marcar como Novedad'}
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: product.isNewArrival ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                                                        </button>
                                                        <Link
                                                            to={`/admin/edit/${product.id}`}
                                                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDeleteProduct(product.id, product.name)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/10 text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 mb-2">
                                                    {product.availableStock === 0 ? (
                                                        <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-black">AGOTADO</span>
                                                    ) : product.availableStock < 5 ? (
                                                        <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-black">STOCK BAJO</span>
                                                    ) : (
                                                        <span className="text-[10px] bg-primary/10 dark:bg-primary/20 text-primary-dark dark:text-primary px-2 py-0.5 rounded-full font-black">STOCK OK</span>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-1 mb-3 bg-slate-50/50 dark:bg-slate-800/50 p-2 rounded-xl">
                                                    <div className="flex items-center justify-between text-[11px]">
                                                        <span className="text-slate-500">Disponible:</span>
                                                        <span className="font-bold">{formatWeight(product.availableStock, product.isFractional)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[11px]">
                                                        <span className="text-slate-500">Reservado:</span>
                                                        <span className="font-bold text-primary-dark dark:text-primary/70">{formatWeight(product.reservedStock, product.isFractional)}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-black text-slate-900 dark:text-white">$ {product.price.toFixed(2)}</span>
                                                    <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                        <button
                                                            onClick={() => handleAdjustStock(product.id, false)}
                                                            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                                                        >
                                                            <span className="material-symbols-outlined text-base">remove</span>
                                                        </button>
                                                        <span className="w-14 text-center font-black text-[10px] tracking-tighter">{formatWeight(product.availableStock, product.isFractional)}</span>
                                                        <button
                                                            onClick={() => handleAdjustStock(product.id, true)}
                                                            className="w-9 h-9 flex items-center justify-center bg-primary text-slate-900 rounded-lg shadow-sm hover:brightness-110 active:scale-90 transition-all"
                                                        >
                                                            <span className="material-symbols-outlined text-base font-black">add</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center opacity-30">
                            <span className="material-symbols-outlined text-6xl mb-2">search_off</span>
                            <p>No hay productos en esta categoría</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Admin Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-background-dark/95 backdrop-blur-lg px-6 pb-6 pt-3 z-50">
                <div className="flex justify-between items-center max-w-7xl mx-auto">
                    <Link to="/admin" className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined text-[28px]">bar_chart</span>
                        <span className="text-[10px] font-medium">Panel</span>
                    </Link>
                    <Link to="/admin/orders" className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors relative">
                        <span className="material-symbols-outlined text-[28px]">assignment</span>
                        {state.hasUnreadOrders && (
                            <span className="absolute top-0 right-1/2 translate-x-3 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-background-dark rounded-full animate-pulse"></span>
                        )}
                        <span className="text-[10px] font-medium">Pedidos</span>
                    </Link>
                    <Link to="/admin/inventory" className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-900 dark:text-primary group">
                        <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                        <span className="text-[10px] font-bold">Inventario</span>
                    </Link>
                    <Link to="/admin/upload" className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined text-[28px]">add_circle</span>
                        <span className="text-[10px] font-medium">Nuevo</span>
                    </Link>
                </div>
            </nav>

            {/* Import XLSX Modal */}
            {showImport && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeImportModal} />

                    {/* Modal */}
                    <div className="relative w-full sm:max-w-xl max-h-[90vh] bg-white dark:bg-surface-dark rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary">upload_file</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-left">Importar Stock</h2>
                                    <p className="text-[11px] text-slate-400 text-left">Desde archivo fiscal (.xlsx)</p>
                                </div>
                            </div>
                            <button 
                                onClick={closeImportModal} 
                                disabled={isImporting}
                                className={`w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-opacity ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Drop zone */}
                            {!importData && (
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`
                                        border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all
                                        ${isDragging
                                            ? 'border-primary bg-primary/5 scale-[1.02]'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-primary/5'}
                                    `}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileSelected(file);
                                        }}
                                    />
                                    <span className="material-symbols-outlined text-5xl text-primary/60 mb-3 block">cloud_upload</span>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        {isDragging ? '¡Soltar archivo aquí!' : 'Arrastrá o tocá para seleccionar'}
                                    </p>
                                    <p className="text-[11px] text-slate-400">Formatos: .xlsx, .xls, .csv</p>
                                </div>
                            )}

                            {/* Preview */}
                            {importData && !importResult && (
                                <div className="space-y-4">
                                    {isImporting ? (
                                        <div className="flex flex-col items-center justify-center py-10 px-4 space-y-6 animate-in fade-in duration-300">
                                            <div className="relative flex items-center justify-center">
                                                <div className="w-24 h-24 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-primary animate-spin"></div>
                                                <span className="absolute text-lg font-black text-slate-800 dark:text-slate-200">{importProgress}%</span>
                                            </div>
                                            <div className="text-center space-y-2">
                                                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Importando inventario...</p>
                                                <p className="text-[11px] text-slate-400">Procesando {importProgress}% ({Math.min(Math.round(importData.rows.length * (importProgress / 100)), importData.rows.length)} de {importData.rows.length} productos)</p>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                                                <div 
                                                    className="bg-primary h-2 rounded-full transition-all duration-300 ease-out" 
                                                    style={{ width: `${importProgress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold">{importData.rows.length} productos encontrados</p>
                                            {importData.errors.length > 0 && (
                                                <p className="text-[11px] text-orange-500">{importData.errors.length} filas con errores</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => { setImportData(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-sm">refresh</span>
                                            Otro archivo
                                        </button>
                                    </div>

                                    {/* Preview table */}
                                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                    <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-widest text-[10px]">Código</th>
                                                    <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-widest text-[10px]">Nombre</th>
                                                    <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-widest text-[10px]">Stock</th>
                                                    <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-widest text-[10px]">Precio</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importData.rows.slice(0, 15).map((row, i) => (
                                                    <tr key={i} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                        <td className="px-3 py-2 text-left font-mono text-slate-600 dark:text-slate-400">{row.codigo}</td>
                                                        <td className="px-3 py-2 text-left truncate max-w-[180px]">{row.nombre}</td>
                                                        <td className="px-3 py-2 text-right font-bold">{row.stock}</td>
                                                        <td className="px-3 py-2 text-right font-bold text-primary-dark dark:text-primary">$ {row.ventaValorizada.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                                {importData.rows.length > 15 && (
                                                    <tr className="border-t border-slate-100 dark:border-slate-800">
                                                        <td colSpan={4} className="px-3 py-2 text-center text-slate-400 text-[11px]">
                                                            ... y {importData.rows.length - 15} productos más
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Result summary */}
                            {importResult && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-green-500 text-2xl">check_circle</span>
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-left">¡Importación completa!</p>
                                            <p className="text-[11px] text-slate-400 text-left">El inventario se actualizó correctamente</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-4 text-center">
                                            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{importResult.updated}</p>
                                            <p className="text-[10px] font-bold text-blue-500 uppercase mt-1">Actualizados</p>
                                        </div>
                                        <div className="bg-green-50 dark:bg-green-900/10 rounded-2xl p-4 text-center">
                                            <p className="text-2xl font-black text-green-600 dark:text-green-400">{importResult.created}</p>
                                            <p className="text-[10px] font-bold text-green-500 uppercase mt-1">Nuevos</p>
                                        </div>
                                        <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-4 text-center">
                                            <p className="text-2xl font-black text-red-600 dark:text-red-400">{importResult.errors.length}</p>
                                            <p className="text-[10px] font-bold text-red-500 uppercase mt-1">Errores</p>
                                        </div>
                                    </div>

                                    {importResult.errors.length > 0 && (
                                        <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-3 max-h-32 overflow-y-auto">
                                            {importResult.errors.map((err, i) => (
                                                <p key={i} className="text-[11px] text-red-600 dark:text-red-400 py-0.5">{err}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                            {!importResult ? (
                                <>
                                    <button
                                        onClick={closeImportModal}
                                        disabled={isImporting}
                                        className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${isImporting ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleImport}
                                        disabled={!importData || importData.rows.length === 0 || isImporting}
                                        className={`
                                            flex-1 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all
                                            ${importData && importData.rows.length > 0 && !isImporting
                                                ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}
                                        `}
                                    >
                                        {isImporting ? (
                                            <>
                                                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                                                Importando...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-lg">cloud_upload</span>
                                                Aplicar Cambios
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={closeImportModal}
                                    className="flex-1 py-3 rounded-2xl text-sm font-black bg-primary text-slate-900 shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
                                >
                                    Cerrar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
