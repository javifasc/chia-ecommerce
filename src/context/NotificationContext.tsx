import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ConfirmOptions {
    title?: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

interface NotificationContextType {
    showToast: (message: string, type?: ToastType) => void;
    showConfirm: (options: ConfirmOptions) => void;
    toasts: Toast[];
    removeToast: (id: string) => void;
    confirmOptions: ConfirmOptions | null;
    closeConfirm: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showConfirm = useCallback((options: ConfirmOptions) => {
        setConfirmOptions(options);
    }, []);

    const closeConfirm = useCallback(() => {
        setConfirmOptions(null);
    }, []);

    return (
        <NotificationContext.Provider value={{ showToast, showConfirm, toasts, removeToast, confirmOptions, closeConfirm }}>
            {children}
            <ToastContainer />
            <ConfirmModal />
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within NotificationProvider');
    return context;
};

// --- Sub-components for internal use ---

const ToastContainer = () => {
    const { toasts, removeToast } = useNotifications();

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
                        pointer-events-auto
                        flex items-center gap-3 p-4 rounded-2xl shadow-xl backdrop-blur-md border border-white/20 text-white
                        animate-in slide-in-from-top-4 duration-300
                        ${toast.type === 'success' ? 'bg-primary-dark/90 text-white' :
                            toast.type === 'error' ? 'bg-red-500/90' :
                                toast.type === 'warning' ? 'bg-orange-500/90' : 'bg-slate-800/90'}
                    `}
                >
                    <span className="material-symbols-outlined text-lg">
                        {toast.type === 'success' ? 'check_circle' :
                            toast.type === 'error' ? 'error' :
                                toast.type === 'warning' ? 'warning' : 'info'}
                    </span>
                    <p className="text-sm font-bold tracking-tight flex-1">{toast.message}</p>
                    <button onClick={() => removeToast(toast.id)} className="opacity-70 hover:opacity-100">
                        <span className="material-symbols-outlined text-base">close</span>
                    </button>
                </div>
            ))}
        </div>
    );
};

const ConfirmModal = () => {
    const { confirmOptions, closeConfirm } = useNotifications();
    if (!confirmOptions) return null;

    const {
        title = 'Confirmar Acción',
        message,
        onConfirm,
        onCancel,
        confirmText = 'Confirmar',
        cancelText = 'Cancelar',
        isDestructive = false
    } = confirmOptions;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={closeConfirm}></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center border border-slate-100 dark:border-slate-800">
                <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-6 
                    ${isDestructive ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-primary/10 text-primary-dark dark:text-primary'}
                `}>
                    <span className="material-symbols-outlined text-3xl">
                        {isDestructive ? 'delete_forever' : 'help_outline'}
                    </span>
                </div>

                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">
                    {message}
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => {
                            onConfirm();
                            closeConfirm();
                        }}
                        className={`w-full py-4 rounded-2xl text-sm font-black shadow-lg shadow-black/5 transition-all active:scale-[0.98]
                            ${isDestructive
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-primary text-slate-900 hover:brightness-105'}
                        `}
                    >
                        {confirmText}
                    </button>
                    <button
                        onClick={() => {
                            if (onCancel) onCancel();
                            closeConfirm();
                        }}
                        className="w-full py-4 rounded-2xl text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
};
