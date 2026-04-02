import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/profile';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const { error } = await login(email, password);

        if (!error) {
            navigate(from, { replace: true });
        } else {
            setError('Credenciales inválidas. Intenta de nuevo.');
            setIsLoading(false);
            if (window.navigator.vibrate) window.navigator.vibrate(200);
        }
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-6 font-display antialiased italic-none">
            <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center">
                    <div className="inline-flex size-16 items-center justify-center rounded-3xl bg-primary/20 text-primary-dark mb-4 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-4xl">account_circle</span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Bienvenido a #CHIA</h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium italic-none">Ingresa para gestionar tus pedidos y envíos</p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 pl-1">Email</label>
                            <input
                                autoFocus
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setError(null);
                                    setEmail(e.target.value);
                                }}
                                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                placeholder="tu@email.com"
                                required
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-2 px-1">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contraseña</label>
                                <button type="button" className="text-[10px] font-bold text-primary-dark opacity-50 hover:opacity-100 transition-opacity">¿Olvidaste tu contraseña?</button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => {
                                        setError(null);
                                        setPassword(e.target.value);
                                    }}
                                    className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-4 pr-12 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                                >
                                    <span className="material-symbols-outlined text-xl">
                                        {showPassword ? 'visibility' : 'visibility_off'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
                            <span className="material-symbols-outlined text-red-500 text-sm">error</span>
                            <p className="text-[10px] text-red-500 font-black uppercase tracking-wider">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary text-slate-900 font-bold py-4 rounded-2xl shadow-lg shadow-primary/30 hover:shadow-primary/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <div className="size-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Iniciar Sesión</span>
                                <span className="material-symbols-outlined text-lg">login</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="space-y-6 pt-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center">
                        ¿No tienes una cuenta?{' '}
                        <Link to="/register" className="text-primary-dark dark:text-primary font-bold hover:underline">
                            Regístrate gratis
                        </Link>
                    </p>
                    
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800" /></div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-background-light dark:bg-background-dark px-4 text-slate-400 font-black">O continúa como invitado</span></div>
                    </div>

                    <Link 
                        to="/shop" 
                        className="flex w-full items-center justify-center font-bold py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">shopping_basket</span>
                        Seguir comprando
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
