import { Link, useLocation } from 'react-router-dom';

const ITEMS = [
    { to: '/shop', icon: 'home', label: 'Inicio' },
    { to: '/catalog', icon: 'manage_search', label: 'Catálogo' },
    { to: '/my-orders', icon: 'assignment', label: 'Pedidos' },
    { to: '/profile', icon: 'person', label: 'Perfil' },
];

/**
 * Barra de navegación inferior compartida por las vistas de tienda.
 * El estado activo se deriva de la ruta, así no queda desincronizado.
 */
const BottomNav = () => {
    const { pathname } = useLocation();

    return (
        <nav
            aria-label="Navegación principal"
            className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 pb-safe pt-1 z-40"
        >
            <div className="flex justify-around items-center px-2 h-16 max-w-md mx-auto">
                {ITEMS.map(item => {
                    const isActive = pathname === item.to;
                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            aria-current={isActive ? 'page' : undefined}
                            className="flex flex-col items-center justify-center gap-0.5 w-16 group"
                        >
                            <span
                                className={`flex items-center justify-center px-3 py-1 rounded-full transition-colors ${isActive
                                    ? 'bg-primary/20'
                                    : 'group-hover:bg-slate-100 dark:group-hover:bg-slate-800'
                                    }`}
                            >
                                <span
                                    className={`material-symbols-outlined ${isActive
                                        ? 'text-slate-900 dark:text-primary'
                                        : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                                        }`}
                                    style={{ fontSize: '24px', fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                                >
                                    {item.icon}
                                </span>
                            </span>
                            <span
                                className={`text-[11px] ${isActive
                                    ? 'text-slate-900 dark:text-primary font-bold'
                                    : 'text-slate-500 dark:text-slate-400 font-medium'
                                    }`}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
