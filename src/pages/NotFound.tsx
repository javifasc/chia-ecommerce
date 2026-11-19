import { Link } from 'react-router-dom';

/** Dirección que no existe: antes se veía una página en blanco. */
const NotFound = () => (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display flex flex-col items-center justify-center p-6 text-center">
        <img src="/logo.png" alt="" className="w-20 h-20 object-contain mb-6" />
        <h1 className="text-2xl font-bold mb-2">No encontramos esta página</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs">
            Puede que el enlace esté mal escrito o que la página ya no exista.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
            <Link to="/shop" className="py-4 rounded-2xl bg-primary text-slate-900 font-bold shadow-lg shadow-primary/30 active:scale-95 transition-transform">
                Ir a la tienda
            </Link>
            <Link to="/" className="py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                Volver al inicio
            </Link>
        </div>
    </div>
);

export default NotFound;
