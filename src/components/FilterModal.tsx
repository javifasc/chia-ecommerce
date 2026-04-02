import { motion, AnimatePresence } from 'framer-motion';

type FilterModalProps = {
    isOpen: boolean;
    onClose: () => void;
    maxPrice: number;
    setMaxPrice: (price: number) => void;
    selectedCategory: string;
    setSelectedCategory: (cat: string) => void;
    selectedBadges: string[];
    setSelectedBadges: (badges: string[]) => void;
    categories: string[];
    onApply: () => void;
};

const FilterModal = ({
    isOpen,
    onClose,
    maxPrice,
    setMaxPrice,
    selectedCategory,
    setSelectedCategory,
    selectedBadges,
    setSelectedBadges,
    categories,
    onApply
}: FilterModalProps) => {
    const dietaryOptions = ['Sin TACC', 'Vegano', 'Sin Azúcar', 'Orgánico', 'Keto'];

    const toggleBadge = (badge: string) => {
        if (selectedBadges.includes(badge)) {
            setSelectedBadges(selectedBadges.filter(b => b !== badge));
        } else {
            setSelectedBadges([...selectedBadges, badge]);
        }
    };
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[32px] z-[70] p-6 shadow-2xl text-left italic-none"
                    >
                        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6" />

                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold">Filtros</h2>
                            <button
                                onClick={() => {
                                    setSelectedBadges([]);
                                    setMaxPrice(9999999);
                                    setSelectedCategory('Todo');
                                }}
                                className="text-primary-dark font-bold text-sm"
                            >
                                Limpiar todo
                            </button>
                        </div>

                        <div className="space-y-8">
                            {/* Category Filter */}
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Categoría</h3>
                                <div className="flex flex-wrap gap-2">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedCategory === cat
                                                ? 'bg-primary text-slate-900 shadow-md shadow-primary/20'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price Range Filter */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Precio Máximo</h3>
                                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                                        {maxPrice >= 1000 ? 'Sin límite' : `$${maxPrice}`}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1000"
                                    step="10"
                                    value={maxPrice > 1000 ? 1000 : maxPrice}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setMaxPrice(val === 1000 ? 9999999 : val);
                                    }}
                                    className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400">
                                    <span>$0</span>
                                    <span>$1000+</span>
                                </div>
                            </div>

                            {/* Dietary Restrictions Filter */}
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Restricciones Alimentarias</h3>
                                <div className="flex flex-wrap gap-2">
                                    {dietaryOptions.map((option) => (
                                        <button
                                            key={option}
                                            onClick={() => toggleBadge(option)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${selectedBadges.includes(option)
                                                ? 'bg-primary text-slate-900 shadow-md shadow-primary/20'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                }`}
                                        >
                                            {selectedBadges.includes(option) && (
                                                <span className="material-symbols-outlined text-[14px]">check</span>
                                            )}
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 pb-4">
                            <button
                                onClick={() => {
                                    onApply();
                                    onClose();
                                }}
                                className="w-full bg-primary text-slate-900 font-bold py-4 rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-transform"
                            >
                                Aplicar Filtros
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default FilterModal;
