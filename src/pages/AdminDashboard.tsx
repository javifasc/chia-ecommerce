import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES_MAP } from '../utils/categoryMapping';
import { Link } from 'react-router-dom';
import { supabaseService } from '../lib/supabaseService';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

type TimeFilter = 'day' | 'week' | 'month';

const CHART_COLORS = [
    '#80ec13', '#34d399', '#60a5fa', '#f472b6', '#a78bfa',
    '#fbbf24', '#fb923c', '#38bdf8', '#e879f9',
];

const AdminDashboard = () => {
    const { state, updateDeliveryFees } = useStore();
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
    const [drillCategory, setDrillCategory] = useState<string | null>(null);
    const [suggestionCount, setSuggestionCount] = useState(0);

    useEffect(() => {
        const fetchSuggestionCount = async () => {
            try {
                const suggestions = await supabaseService.getSuggestions();
                const total = suggestions.reduce((sum, s) => sum + s.count, 0);
                setSuggestionCount(total);
            } catch (error) {
                console.error('Error fetching suggestion count:', error);
            }
        };
        fetchSuggestionCount();
    }, []);


    // Combine delivered orders from active + history
    const allDeliveredOrders = useMemo(() => {
        const delivered = state.orders.filter(o => o.status === 'Entregado');
        return [...delivered, ...state.historyOrders];
    }, [state.orders, state.historyOrders]);

    // Filter by time range
    const filteredOrders = useMemo(() => {
        const now = new Date();
        const start = new Date();

        if (timeFilter === 'day') {
            start.setHours(0, 0, 0, 0);
        } else if (timeFilter === 'week') {
            start.setDate(now.getDate() - 7);
            start.setHours(0, 0, 0, 0);
        } else {
            start.setDate(now.getDate() - 30);
            start.setHours(0, 0, 0, 0);
        }

        return allDeliveredOrders.filter(o => new Date(o.createdAt) >= start);
    }, [allDeliveredOrders, timeFilter]);

    // Daily sales count data
    const dailySalesData = useMemo(() => {
        const map: Record<string, number> = {};
        filteredOrders.forEach(o => {
            const day = new Date(o.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
            map[day] = (map[day] || 0) + 1;
        });
        return Object.entries(map)
            .map(([date, count]) => ({ date, ventas: count }))
            .sort((a, b) => {
                const [da, ma] = a.date.split('/').map(Number);
                const [db, mb] = b.date.split('/').map(Number);
                return (ma - mb) || (da - db);
            });
    }, [filteredOrders]);

    // Daily revenue data
    const dailyRevenueData = useMemo(() => {
        const map: Record<string, number> = {};
        filteredOrders.forEach(o => {
            const day = new Date(o.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
            map[day] = (map[day] || 0) + o.total;
        });
        return Object.entries(map)
            .map(([date, total]) => ({ date, facturado: Math.round(total * 100) / 100 }))
            .sort((a, b) => {
                const [da, ma] = a.date.split('/').map(Number);
                const [db, mb] = b.date.split('/').map(Number);
                return (ma - mb) || (da - db);
            });
    }, [filteredOrders]);

    // Category pie data (drill-down)
    const categoryPieData = useMemo(() => {
        if (drillCategory) {
            // Show subcategories for the selected category
            const subMap: Record<string, number> = {};
            filteredOrders.forEach(o => {
                o.items.forEach(item => {
                    const product = state.products.find(p => p.id === item.productId);
                    if (product && product.category === drillCategory) {
                        const sub = product.subcategory || 'Sin subcategoría';
                        subMap[sub] = (subMap[sub] || 0) + item.quantity;
                    }
                });
            });
            return Object.entries(subMap).map(([name, value]) => ({ name, value }));
        }

        // Main categories
        const catMap: Record<string, number> = {};
        filteredOrders.forEach(o => {
            o.items.forEach(item => {
                const product = state.products.find(p => p.id === item.productId);
                if (product) {
                    catMap[product.category] = (catMap[product.category] || 0) + item.quantity;
                }
            });
        });
        return Object.entries(catMap).map(([name, value]) => ({ name, value }));
    }, [filteredOrders, state.products, drillCategory]);

    const totalSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const pendingOrdersCount = state.orders.filter(o => o.status === 'Pendiente').length;
    const lowStockCount = state.products.filter(p => p.availableStock < 5).length;
    const totalProducts = state.products.length;

    const filterLabels: Record<TimeFilter, string> = { day: 'Hoy', week: 'Semana', month: 'Mes' };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen pb-20 italic-none">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-4 pt-6 pb-2 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="h-16 w-16 rounded-full bg-transparent overflow-hidden ring-2 ring-primary/20 flex items-center justify-center">
                            <img src="/logo.png" alt="Owner Logo" className="w-full h-full object-contain" />
                        </div>
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-primary border-2 border-background-light dark:border-background-dark"></div>
                    </div>
                    <div className="text-left">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Panel de Dueño</p>
                        <h1 className="text-xl font-bold leading-none">Dashboard #CHIA</h1>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Link to="/admin/suggestions" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 relative">
                        <span className="material-symbols-outlined">volunteer_activism</span>
                        {suggestionCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white dark:ring-background-dark animate-pulse">
                                {suggestionCount > 9 ? '9+' : suggestionCount}
                            </span>
                        )}
                    </Link>
                    <Link to="/" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300">
                        <span className="material-symbols-outlined">storefront</span>
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-4 space-y-6">
                {/* Time Filter Toggle */}
                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-1">
                    {(['day', 'week', 'month'] as TimeFilter[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setTimeFilter(f)}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${timeFilter === f
                                ? 'bg-white dark:bg-surface-dark text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                                }`}
                        >
                            {filterLabels[f]}
                        </button>
                    ))}
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-3 text-left">
                    <div className="col-span-2 bg-white dark:bg-surface-dark rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <span className="material-symbols-outlined text-6xl text-primary">attach_money</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Facturado ({filterLabels[timeFilter]})</p>
                        <div className="flex items-end gap-2 mb-2">
                            <h2 className="text-3xl font-bold tracking-tight">${totalSales.toFixed(2)}</h2>
                            <span className="flex items-center text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-1">
                                <span className="material-symbols-outlined text-[14px] mr-1">trending_up</span>
                                {filteredOrders.length} pedidos
                            </span>
                        </div>
                    </div>

                    <Link to="/admin/orders" className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 hover:border-primary/50 transition-colors">
                        <p className="text-slate-500 text-xs font-medium mb-1">Pedidos Pendientes</p>
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-bold">{pendingOrdersCount}</h3>
                            <span className="material-symbols-outlined text-orange-500">pending_actions</span>
                        </div>
                    </Link>

                    <Link to="/admin/inventory" className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 hover:border-red-400/50 transition-colors">
                        <p className="text-slate-500 text-xs font-medium mb-1">Stock Bajo</p>
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-bold">{lowStockCount}</h3>
                            <span className="material-symbols-outlined text-red-500">warning</span>
                        </div>
                    </Link>
                </div>

                {/* Bar Chart: Daily Sales Count */}
                <div className="bg-white dark:bg-surface-dark rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 text-left">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg">Ventas por Día</h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filterLabels[timeFilter]}</span>
                    </div>
                    {dailySalesData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={dailySalesData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(15,23,42,0.9)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        color: '#fff',
                                        padding: '8px 12px',
                                    }}
                                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
                                />
                                <Bar dataKey="ventas" fill="#80ec13" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
                            <span className="material-symbols-outlined mr-2">info</span>
                            Sin datos para este período
                        </div>
                    )}
                </div>

                {/* Bar Chart: Daily Revenue */}
                <div className="bg-white dark:bg-surface-dark rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 text-left">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg">Facturación por Día</h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filterLabels[timeFilter]}</span>
                    </div>
                    {dailyRevenueData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={dailyRevenueData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `$${v}`} />
                                <Tooltip
                                    formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Facturado']}
                                    contentStyle={{
                                        backgroundColor: 'rgba(15,23,42,0.9)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        color: '#fff',
                                        padding: '8px 12px',
                                    }}
                                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
                                />
                                <Bar dataKey="facturado" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
                            <span className="material-symbols-outlined mr-2">info</span>
                            Sin datos para este período
                        </div>
                    )}
                </div>

                {/* Pie Chart: Category / Subcategory Drill-down */}
                <div className="bg-white dark:bg-surface-dark rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 text-left">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-lg">
                                {drillCategory ? drillCategory : 'Ventas por Categoría'}
                            </h3>
                            {drillCategory && (
                                <p className="text-xs text-slate-400 mt-0.5">Subcategorías</p>
                            )}
                        </div>
                        {drillCategory ? (
                            <button
                                onClick={() => setDrillCategory(null)}
                                className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm">arrow_back</span>
                                Volver
                            </button>
                        ) : (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Click para detalles</span>
                        )}
                    </div>
                    {categoryPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={categoryPieData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={50}
                                    outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="value"
                                    onClick={(entry) => {
                                        if (!drillCategory && CATEGORIES_MAP[entry.name]) {
                                            setDrillCategory(entry.name);
                                        }
                                    }}
                                    style={{ cursor: drillCategory ? 'default' : 'pointer' }}
                                >
                                    {categoryPieData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Legend
                                    layout="horizontal"
                                    verticalAlign="bottom"
                                    wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                                    formatter={(value) => <span className="text-slate-600 dark:text-slate-300 font-medium">{value}</span>}
                                />
                                <Tooltip
                                    formatter={(value: any) => [`${value} uds`, 'Cantidad']}
                                    contentStyle={{
                                        backgroundColor: 'rgba(15,23,42,0.9)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        color: '#fff',
                                        padding: '8px 12px',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
                            <span className="material-symbols-outlined mr-2">info</span>
                            Sin datos para este período
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-surface-dark rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 text-left">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary">local_shipping</span>
                        <h3 className="font-bold text-lg">Configuración de Envíos</h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Configura el monto mínimo para habilitar el envío gratis a domicilio (Rada Tilly).</p>

                    <div className="p-4 bg-primary/10 dark:bg-primary/5 rounded-2xl border border-primary/20">
                        <label className="block text-xs font-bold uppercase tracking-widest text-primary-dark dark:text-primary mb-3">Envío Gratis a Domicilio</label>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Gratis a partir de:</span>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-sm">$</span>
                                <input
                                    type="number"
                                    value={state.freeShippingThreshold}
                                    onChange={(e) => updateDeliveryFees({ '_FREE_THRESHOLD_': Number(e.target.value) })}
                                    className="w-24 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                                    placeholder="Ej: 5000"
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3 italic">
                            Los pedidos que alcancen este monto podrán solicitar envío a domicilio sin costo adicional.
                        </p>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-1 gap-4">
                    <Link to="/admin/promotions" className="block bg-primary/10 dark:bg-primary/5 p-5 rounded-2xl border border-primary/20 text-left hover:bg-primary/20 transition-all shadow-sm group">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary-dark">
                                    <span className="material-symbols-outlined">auto_awesome</span>
                                </div>
                                <div>
                                    <p className="font-black text-sm uppercase tracking-tight">Gestión de Portada</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Edita banners, novedades y ofertas.</p>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">arrow_forward</span>
                        </div>
                    </Link>

                    <Link to="/admin/inventory" className="block bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-slate-400">inventory</span>
                            <div>
                                <p className="text-sm font-bold">Resumen de Inventario</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Gestionando {totalProducts} productos activos.</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Admin Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-background-dark/95 backdrop-blur-lg px-6 pb-safe pt-3 z-50">
                <div className="flex justify-between items-center max-w-md mx-auto h-16">
                    <Link to="/admin" className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-900 dark:text-primary group">
                        <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>bar_chart</span>
                        <span className="text-[10px] font-bold">Panel</span>
                    </Link>
                    <Link to="/admin/orders" className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors relative">
                        <span className="material-symbols-outlined text-[28px]">assignment</span>
                        {state.hasUnreadOrders && (
                            <span className="absolute top-0 right-1/2 translate-x-3 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-background-dark rounded-full animate-pulse"></span>
                        )}
                        <span className="text-[10px] font-medium">Pedidos</span>
                    </Link>
                    <Link to="/admin/inventory" className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined text-[28px]">inventory_2</span>
                        <span className="text-[10px] font-medium">Inventario</span>
                    </Link>
                    <Link to="/admin/upload" className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined text-[28px]">add_circle</span>
                        <span className="text-[10px] font-medium">Nuevo</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
