import { useState } from 'react';
import { supabaseService } from '../lib/supabaseService';
import { motion, AnimatePresence } from 'framer-motion';

const SuggestionBox = () => {
    const [suggestion, setSuggestion] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!suggestion.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await supabaseService.submitSuggestion(suggestion);
            setSuggestion('');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);
        } catch (error) {
            console.error('Error submitting suggestion:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 mb-8 overflow-hidden relative">
            <AnimatePresence>
                {showSuccess ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center justify-center py-4 text-center"
                    >
                        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">¡Gracias por tu aporte!</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Lo tendremos en cuenta para nuestras sugerencias de compra.</p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary">volunteer_activism</span>
                            </div>
                            <div className="text-left">
                                <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight mt-1">¿No encontrás algo?</h4>
                                <p className="text-[11px] text-slate-400 uppercase font-bold tracking-widest">Contanos qué te gustaría que sumemos</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={suggestion}
                                    onChange={(e) => setSuggestion(e.target.value)}
                                    placeholder="Ej: Mantequilla de maní natural, Harina de coco..."
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium text-left italic-none"
                                    maxLength={100}
                                    required
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">
                                    {suggestion.length}/100
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={!suggestion.trim() || isSubmitting}
                                className={`
                                    py-3 px-6 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95
                                    ${suggestion.trim() && !isSubmitting
                                        ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20 hover:brightness-105'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}
                                `}
                            >
                                {isSubmitting ? (
                                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">send</span>
                                        Enviar
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default SuggestionBox;
