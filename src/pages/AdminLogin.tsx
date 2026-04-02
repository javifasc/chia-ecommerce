import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/admin';

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
            // Vibrate if on mobile
            if (window.navigator.vibrate) window.navigator.vibrate(200);
        }
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-6 font-display antialiased italic-none">
            <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center">
                    <div className="inline-flex size-16 items-center justify-center rounded-3xl bg-primary/20 text-primary-dark mb-4">
                        <span className="material-symbols-outlined text-4xl">lock</span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Acceso Dueño</h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">#CHIA Gestión Administrativa</p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 pl-1">Email</label>
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
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 pl-1">Contraseña</label>
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
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined text-xl">
                                        {showPassword ? 'visibility' : 'visibility_off'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <p className="text-xs text-red-500 font-bold animate-in slide-in-from-top-1 duration-200 pl-1">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary text-slate-900 font-bold py-4 rounded-2xl shadow-lg shadow-primary/30 hover:shadow-primary/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                    >
                        {isLoading ? 'Verificando...' : 'Ingresar al Panel'}
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                </form>

                <div className="text-center pt-8">
                    <Link to="/" className="text-sm font-bold text-sage hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center gap-1 group">
                        <span className="material-symbols-outlined text-base transition-transform group-hover:-translate-x-1">arrow_back</span>
                        Volver a la Tienda
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
