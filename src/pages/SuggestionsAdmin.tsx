import { useState, useEffect } from 'react';
import { supabaseService } from '../lib/supabaseService';
import { ProductSuggestion } from '../types';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';

const SuggestionsAdmin = () => {
    const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showToast, showConfirm } = useNotifications();

    useEffect(() => {
        loadSuggestions();
    }, []);

    const loadSuggestions = async () => {
        setIsLoading(true);
        try {
            const data = await supabaseService.getSuggestions();
            setSuggestions(data);
        } catch (error) {
            console.error('Error loading suggestions:', error);
            showToast('Error al cargar las sugerencias', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = (id: string, text: string) => {
        showConfirm({
            title: '¿Borrar sugerencia?',
            message: `¿Estás seguro de que quieres eliminar la sugerencia "${text}"?`,
            confirmText: 'Borrar',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await supabaseService.deleteSuggestion(id);
                    setSuggestions(prev => prev.filter(s => s.id !== id));
                    showToast('Sugerencia eliminada', 'info');
                } catch (error) {
                    showToast('Error al eliminar', 'error');
                }
            }
        });
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display antialiased text-slate-900 dark:text-slate-100 min-h-screen pb-24 italic-none">
            <header className="sticky top-0 z-20 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 pt-6 pb-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link to="/admin" className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <h1 className="text-xl font-bold flex-1 text-center"><span className="text-primary mr-1">#CHIA</span> Sugerencias</h1>
                    <button onClick={loadSuggestions} className="p-2 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <span className="material-symbols-outlined">refresh</span>
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                    </div>
                ) : suggestions.length > 0 ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-6 px-2">
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200">Pedidos de clientes</h2>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Ordenado por popularidad</p>
                            </div>
                            <span className="text-xl font-black text-primary">{suggestions.length}</span>
                        </div>

                        <AnimatePresence mode='popLayout'>
                            {suggestions.map((s) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={s.id}
                                    className="bg-white dark:bg-surface-dark p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center shrink-0">
                                            <span className="text-xl font-black text-slate-900 dark:text-white">{s.count}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white capitalize">{s.text}</h3>
                                            <p className="text-[11px] text-slate-400 font-medium">Sugerido {s.count} veces • {new Date(s.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(s.id, s.text)}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/10 text-red-300 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="py-20 text-center opacity-30 flex flex-col items-center">
                        <span className="material-symbols-outlined text-6xl mb-4">volunteer_activism</span>
                        <p className="font-bold">Aún no hay sugerencias de clientes</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SuggestionsAdmin;
