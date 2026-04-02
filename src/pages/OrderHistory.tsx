import { useStore } from '../context/StoreContext';
import { Link } from 'react-router-dom';

const OrderHistory = () => {
    const { state } = useStore();

    const totalEarnings = state.historyOrders.reduce((sum, order) => sum + order.total, 0);

    return (
        <div className="bg-background-light dark:bg-background-dark font-display antialiased text-slate-900 dark:text-slate-100 min-h-screen pb-24 relative italic-none">
            <header className="sticky top-0 z-20 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 pt-6 pb-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link to="/admin/orders" className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <h1 className="text-xl font-bold flex-1 text-center"><span className="text-primary mr-1">#CHIA</span> Historial</h1>
                    <div className="w-10"></div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-8 text-left">
                {/* Earnings Summary */}
                <div className="p-6 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary-dark dark:text-primary/70 mb-1">Ingresos Totales (Histórico)</p>
                        <p className="text-4xl font-black text-slate-900 dark:text-white">$ {totalEarnings.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-slate-900 shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined text-2xl font-black">payments</span>
                        </div>
                    </div>
                </div>

                {/* History List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Registros ({state.historyOrders.length})</h2>
                    </div>

                    {state.historyOrders.length > 0 ? (
                        <div className="space-y-3">
                            {state.historyOrders.map((order) => (
                                <div key={order.id} className="bg-white dark:bg-surface-dark p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom duration-300">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-primary-dark dark:text-primary">{order.id}</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span className="text-[11px] font-medium text-slate-400">
                                                    {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-slate-900 dark:text-slate-100">{order.customerName}</h3>
                                        </div>
                                        <span className="text-lg font-black text-slate-900 dark:text-white">$ {order.total.toFixed(2)}</span>
                                    </div>

                                    <div className="space-y-1.5 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                        <div className="flex flex-col gap-1 mb-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[14px] text-slate-400">
                                                    {order.deliveryMethod === 'Envío' ? 'local_shipping' : 'storefront'}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                                    {order.deliveryMethod === 'Envío' ? `Envío: ${order.deliveryZone}` : 'Retiro en Local'}
                                                </span>
                                            </div>
                                            {order.deliveryMethod === 'Envío' && order.address && (
                                                <div className="flex items-start gap-1.5">
                                                    <span className="material-symbols-outlined text-[14px] text-slate-400">location_on</span>
                                                    <span className="text-[10px] font-medium text-slate-400 leading-tight">
                                                        {order.address}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {order.items.map((item, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs">
                                                <p className="text-slate-500">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{item.quantity}x</span> {item.name}
                                                </p>
                                                <span className="text-slate-400">$ {(item.price * item.quantity).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center opacity-30">
                            <span className="material-symbols-outlined text-6xl mb-2">history_toggle_off</span>
                            <p className="text-sm font-medium">No hay registros históricos todavía</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default OrderHistory;
