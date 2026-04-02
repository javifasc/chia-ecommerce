import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { signUp } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const { error } = await signUp(email, password, fullName);

        if (!error) {
            // Usually Supabase auto-logs in after signup if email confirm is off
            // Or if it's on, we might need a "Check your email" message
            // For now, let's assume it works and redirect to profile
            navigate('/profile');
        } else {
            setError(error.message || 'Error al registrarse. Intenta de nuevo.');
            setIsLoading(false);
            if (window.navigator.vibrate) window.navigator.vibrate(200);
        }
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-6 font-display antialiased italic-none">
            <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center">
                    <div className="inline-flex size-16 items-center justify-center rounded-3xl bg-primary/20 text-primary-dark mb-4 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-4xl">person_add</span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Crea tu cuenta</h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium italic-none">Ahorra tiempo guardando tus datos de envío</p>
                </div>

                {/* Benefits List */}
                <div className="bg-sage/5 dark:bg-slate-800/50 p-4 rounded-3xl border border-sage/10 dark:border-slate-700/50 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[14px] text-primary-dark">bolt</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Reserva en segundos sin rellenar datos</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[14px] text-primary-dark">history</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Acceso a tu historial de pedidos</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[14px] text-primary-dark">sell</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Ofertas y preventas exclusivas</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 pl-1">Nombre Completo</label>
                            <input
                                autoFocus
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                placeholder="Ej: Juan Pérez"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 pl-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                placeholder="tu@email.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 pl-1">Contraseña</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-4 pr-12 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                    placeholder="8+ caracteres"
                                    minLength={8}
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
                                <span>Crear Mi Cuenta</span>
                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="space-y-6 pt-4 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        ¿Ya tienes una cuenta?{' '}
                        <Link to="/login" className="text-primary-dark dark:text-primary font-bold hover:underline">
                            Inicia Sesión
                        </Link>
                    </p>
                    
                    <Link 
                        to="/shop" 
                        className="text-xs font-black uppercase tracking-widest text-slate-300 hover:text-slate-700 dark:hover:text-white transition-colors"
                    >
                        Continuar como invitado
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
