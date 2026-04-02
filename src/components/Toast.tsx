import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
}

const Toast = ({ message, isVisible, onClose }: ToastProps) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 2000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 dark:bg-primary text-white dark:text-slate-900 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
                >
                    <span className="material-symbols-outlined text-primary dark:text-slate-900" style={{ fontSize: '20px' }}>check_circle</span>
                    <span className="text-sm font-bold tracking-tight">{message}</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;
