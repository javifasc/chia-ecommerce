import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useStore, OrderStatus } from '../context/StoreContext';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

const OrderManagement = () => {
    const { state, dispatch, updateOrderStatus, markOrdersAsRead } = useStore();
    const { showConfirm, showToast } = useNotifications();
    const [viewType, setViewType] = useState<'kanban' | 'compact'>('kanban');
    const mainRef = useRef<HTMLElement>(null);

    useEffect(() => {
        markOrdersAsRead();
    }, [markOrdersAsRead]);

    const handleWheel = useCallback((e: React.WheelEvent<HTMLElement>) => {
        if (viewType !== 'kanban' || !mainRef.current) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault();
            mainRef.current.scrollLeft += e.deltaY;
        }
    }, [viewType]);

    const columns: { label: string; status: OrderStatus; color: string }[] = [
        { label: 'Pendiente', status: 'Pendiente', color: 'bg-orange-400' },
        { label: 'En Preparación', status: 'Preparación', color: 'bg-blue-400' },
        { label: 'Listo', status: 'Listo', color: 'bg-green-400' },
        { label: 'Entregado', status: 'Entregado', color: 'bg-slate-400' },
    ];

    const groupedOrders = useMemo(() => {
        return columns.map(col => ({
            ...col,
            orders: state.orders.filter(o => o.status === col.status)
        }));
    }, [state.orders]);

    const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        try {
            await updateOrderStatus(orderId, newStatus);
            showToast(`Pedido actualizado a ${newStatus}`, 'success');
        } catch (error) {
            console.error('Error updating order status:', error);
            showToast('Error al actualizar el estado del pedido', 'error');
        }
    };

    const getNextStatus = (current: OrderStatus): OrderStatus | null => {
        const sequence: OrderStatus[] = ['Pendiente', 'Preparación', 'Listo', 'Entregado'];
        const idx = sequence.indexOf(current);
        return idx < sequence.length - 1 ? sequence[idx + 1] : null;
    };

    const handleClearDelivered = () => {
        const deliveredCount = state.orders.filter(o => o.status === 'Entregado').length;
        if (deliveredCount === 0) {
            showToast('No hay pedidos entregados para limpiar.', 'info');
            return;
        }

        showConfirm({
            title: '¿Limpiar Pedidos?',
            message: `¿Estás seguro de que quieres eliminar los ${deliveredCount} pedidos entregados? Esta acción no se puede deshacer.`,
            confirmText: 'Limpiar',
            isDestructive: true,
            onConfirm: () => {
                dispatch({ type: 'CLEAR_DELIVERED_ORDERS' });
                showToast(`${deliveredCount} pedidos limpiados con éxito.`, 'success');
            }
        });
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-text-main dark:text-white font-display h-screen flex flex-col overflow-hidden italic-none">
            <header className="flex items-center justify-between px-5 pt-12 pb-4 bg-background-light dark:bg-background-dark sticky top-0 z-20">
                <div className="text-left">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Pedidos en Vivo</h1>
                    <p className="text-xs font-medium text-sage/80 dark:text-primary/80">Gestiona las reservas de hoy</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        to="/admin/orders/history"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-surface-dark shadow-sm border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-primary transition-colors"
                        title="Ver Historial"
                    >
                        <span className="material-symbols-outlined text-xl">history</span>
                    </Link>
                    <button
                        onClick={() => setViewType(viewType === 'kanban' ? 'compact' : 'kanban')}
                        className={`flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-surface-dark shadow-sm border border-slate-100 dark:border-slate-800 transition-colors ${viewType === 'compact' ? 'text-primary' : 'text-slate-400'}`}
                        title={viewType === 'kanban' ? 'Cambiar a vista compacta' : 'Cambiar a vista tablero'}
                    >
                        <span className="material-symbols-outlined text-xl">{viewType === 'kanban' ? 'view_list' : 'view_kanban'}</span>
                    </button>
                    <button
                        onClick={handleClearDelivered}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-surface-dark shadow-sm border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-primary transition-colors"
                        title="Limpiar entregados"
                    >
                        <span className="material-symbols-outlined text-xl">mop</span>
                    </button>
                    <Link to="/admin" className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-surface-dark shadow-sm border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                        <span className="material-symbols-outlined text-xl">grid_view</span>
                    </Link>
                </div>
            </header>

            <main ref={mainRef} onWheel={handleWheel} className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar px-5 pb-32 snap-x snap-mandatory">
                {viewType === 'kanban' ? (
                    <div className="flex h-full gap-4 w-max">
                        {groupedOrders.map((col) => (
                            <div key={col.status} className="w-[85vw] sm:w-[320px] h-full flex flex-col snap-center rounded-3xl bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between sticky top-0 bg-white dark:bg-surface-dark z-10">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                                        <h2 className="font-bold text-slate-900 dark:text-slate-100">{col.label}</h2>
                                    </div>
                                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded-full">
                                        {col.orders.length}
                                    </span>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-32">
                                    {col.orders.length > 0 ? col.orders.map((order) => (
                                        <div key={order.id} className="bg-background-light dark:bg-background-dark p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-300 text-left">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-black tracking-tighter text-primary-dark dark:text-primary">{order.id}</span>
                                                <span className="text-[10px] font-medium opacity-50">
                                                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1 leading-tight">{order.customerName}</h3>

                                            <div className="space-y-1 my-3 bg-white/50 dark:bg-slate-800/50 p-2 rounded-xl">
                                                {order.items.map((item, i) => (
                                                    <p key={i} className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                                        <span className="text-primary-dark dark:text-primary font-black">{item.quantity}x</span> {item.name}
                                                    </p>
                                                ))}
                                            </div>

                                            <div className="flex flex-col gap-1 mb-3 px-2">
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

                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                                <span className="text-sm font-black text-slate-900 dark:text-white">${order.total.toFixed(2)}</span>
                                                {getNextStatus(order.status) && (
                                                    <button
                                                        onClick={() => handleStatusChange(order.id, getNextStatus(order.status)!)}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-primary text-slate-900 text-[10px] font-black rounded-xl shadow-md shadow-primary/20 active:scale-95 transition-all"
                                                    >
                                                        {order.status === 'Listo' ? 'Entregar' : 'Siguiente'}
                                                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-10 text-center opacity-20">
                                            <span className="material-symbols-outlined text-4xl">inbox</span>
                                            <p className="text-xs mt-2">Vacío</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto w-full space-y-6 overflow-y-auto no-scrollbar pb-32">
                        {groupedOrders.filter(col => col.orders.length > 0).map((col) => (
                            <div key={col.status} className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <div className={`w-1.5 h-4 rounded-full ${col.color}`}></div>
                                    <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{col.label} ({col.orders.length})</h2>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {col.orders.map((order) => (
                                        <div key={order.id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-right duration-300">
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-[9px] font-black text-primary-dark dark:text-primary">{order.id}</span>
                                                    <h3 className="font-bold text-slate-900 dark:text-white truncate">{order.customerName}</h3>
                                                </div>
                                                <p className="text-[10px] text-slate-400 truncate">
                                                    {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">$ {order.total.toFixed(2)}</span>
                                                {getNextStatus(order.status) && (
                                                    <button
                                                        onClick={() => handleStatusChange(order.id, getNextStatus(order.status)!)}
                                                        className="w-10 h-10 flex items-center justify-center bg-primary text-slate-900 rounded-xl shadow-md shadow-primary/10 active:scale-90 transition-all shrink-0"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Admin Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 flex gap-2 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md px-4 pb-10 pt-2 z-30">
                <Link to="/admin" className="flex flex-1 flex-col items-center justify-end gap-1 text-sage dark:text-slate-400">
                    <span className="material-symbols-outlined text-2xl">bar_chart</span>
                    <p className="text-[10px] font-medium">Panel</p>
                </Link>
                <Link to="/admin/orders" className="flex flex-1 flex-col items-center justify-end gap-1 text-slate-900 dark:text-primary relative">
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>assignment</span>
                    {state.hasUnreadOrders && (
                        <span className="absolute top-0 right-1/2 translate-x-3 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-background-dark rounded-full"></span>
                    )}
                    <p className="text-[10px] font-bold">Pedidos</p>
                </Link>
                <Link to="/admin/inventory" className="flex flex-1 flex-col items-center justify-end gap-1 text-sage dark:text-slate-400">
                    <span className="material-symbols-outlined text-2xl">inventory_2</span>
                    <p className="text-[10px] font-medium">Inventario</p>
                </Link>
                <Link to="/admin/upload" className="flex flex-1 flex-col items-center justify-end gap-1 text-sage dark:text-slate-400">
                    <span className="material-symbols-outlined text-2xl">add_circle</span>
                    <p className="text-[10px] font-medium">Nuevo</p>
                </Link>
            </nav>
        </div>
    );
};

export default OrderManagement;
