import { useStore } from '../context/StoreContext';
import { Link } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const BuyerOrders = () => {
    const { state } = useStore();

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen pb-28 relative selection:bg-primary not-italic">
            <header className="sticky top-0 z-40 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-5 pt-safe-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <Link to="/shop" aria-label="Volver a la tienda" className="w-11 h-11 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform">
                        <span aria-hidden="true" className="material-symbols-outlined text-slate-800 dark:text-white" style={{ fontSize: '20px' }}>arrow_back</span>
                    </Link>
                    <h1 className="text-lg font-bold">Mis Pedidos</h1>
                    <div className="w-11"></div>
                </div>
            </header>

            <main className="px-5 py-6 space-y-4 text-left max-w-2xl mx-auto">
                {state.orders.length > 0 ? (
                    state.orders.map((order) => (
                        <div key={order.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom duration-300">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{order.id}</h3>
                                    <p className="text-[11px] text-slate-400 font-medium">
                                        {new Date(order.createdAt).toLocaleDateString()} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-[11px] font-bold ${order.status === 'Pendiente' ? 'bg-orange-100 text-orange-600' :
                                    order.status === 'Preparación' ? 'bg-blue-100 text-blue-600' :
                                        order.status === 'Listo' ? 'bg-green-100 text-green-600' :
                                            'bg-slate-100 text-slate-500'
                                    }`}>
                                    {order.status.toUpperCase()}
                                </span>
                            </div>

                            <div className="space-y-1 mb-4">
                                {order.items.map((item, i) => (
                                    <p key={i} className="text-xs text-slate-600 dark:text-slate-400">
                                        <span className="font-bold">{item.quantity}x</span> {item.name}
                                    </p>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-dashed border-slate-100 dark:border-slate-700">
                                <span className="text-xs font-medium text-slate-400">Total pagado</span>
                                <span className="text-base font-bold text-slate-900 dark:text-white">${order.total.toFixed(2)}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                        <span aria-hidden="true" className="material-symbols-outlined text-6xl mb-4">history_edu</span>
                        <p className="text-sm font-medium">Aún no has realizado pedidos.</p>
                        <Link to="/shop" className="text-primary-dark font-bold text-sm mt-2">Ir a comprar</Link>
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
};

export default BuyerOrders;
