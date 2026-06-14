import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const { login, signInWithGoogle } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/profile';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const result = await login(email, password);

        if (!result.error) {
            navigate(from, { replace: true });
        } else {
            const errorMessage = result.error.message === 'Invalid login credentials' 
                ? 'Email o contraseña incorrectos.' 
                : result.error.message === 'Email not confirmed'
                ? 'Debes confirmar tu email antes de ingresar.'
                : result.error.message;
                
            setError(errorMessage);
            setIsLoading(false);
            if (window.navigator.vibrate) window.navigator.vibrate(200);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        setError(null);
        const { error } = await signInWithGoogle();
        if (error) {
            setError('Error al iniciar sesión con Google.');
            setIsGoogleLoading(false);
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

                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800" /></div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-background-light dark:bg-background-dark px-4 text-slate-400 font-black">O</span></div>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading || isGoogleLoading}
                    className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {isGoogleLoading ? (
                        <div className="size-5 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin" />
                    ) : (
                        <>
                            <svg className="size-5" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            <span>Continuar con Google</span>
                        </>
                    )}
                </button>

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
