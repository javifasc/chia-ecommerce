import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, ProfileData } from '../context/AuthContext';
import { useStore, Product } from '../context/StoreContext';

const Profile = () => {
    const { profile, isAuthenticated, logout, updateProfile, loading } = useAuth();
    const { state, dispatch } = useStore();
    const navigate = useNavigate();
    const [clickCount, setClickCount] = useState(0);
    const [showFavorites, setShowFavorites] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<ProfileData>>({});
    const [isSaving, setIsSaving] = useState(false);

    const favoriteProducts = useMemo(() => {
        return state.products.filter(p => state.favorites.includes(p.id));
    }, [state.products, state.favorites]);

    const handleToggleFavorite = (productId: string) => {
        dispatch({ type: 'TOGGLE_FAVORITE', productId });
    };

    const handleAdminAccess = () => {
        logout();
        navigate('/admin/login');
    };

    const handleLogoClick = () => {
        setClickCount(prev => prev + 1);
    };

    useEffect(() => {
        if (clickCount === 5) {
            handleAdminAccess();
            setClickCount(0);
            return;
        }

        const timer = setTimeout(() => {
            if (clickCount > 0) setClickCount(0);
        }, 2000);

        return () => clearTimeout(timer);
    }, [clickCount]);

    useEffect(() => {
        if (profile) {
            setEditForm({
                full_name: profile.full_name,
                phone: profile.phone,
                address: profile.address,
                city: profile.city
            });
        }
    }, [profile]);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        const { error } = await updateProfile(editForm);
        setIsSaving(false);
        if (!error) {
            setIsEditing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
                <div className="size-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen pb-24 relative selection:bg-primary italic-none">
            <header className="sticky top-0 z-50 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-5 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <Link to="/shop" className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform">
                        <span className="material-symbols-outlined text-slate-800 dark:text-white" style={{ fontSize: '20px' }}>arrow_back</span>
                    </Link>
                    <h1 className="text-lg font-bold">Mi Perfil</h1>
                    <div className="w-10"></div>
                </div>
            </header>

            <main className="px-5 py-8 space-y-8 text-left">
                {!isAuthenticated ? (
                    /* Guest View */
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white dark:bg-slate-800 rounded-[40px] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 text-center space-y-4">
                            <div className="inline-flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary-dark">
                                <span className="material-symbols-outlined text-5xl">account_circle</span>
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">Únete a #CHIA</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Regístrate para guardar tus datos de envío y agilizar tus próximas compras.</p>
                            <div className="pt-4 space-y-3">
                                <Link to="/login" className="block w-full bg-primary text-slate-900 font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all">
                                    Iniciar Sesión
                                </Link>
                                <Link to="/register" className="block w-full bg-white dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 font-bold py-4 rounded-2xl active:scale-[0.98] transition-all">
                                    Crear Cuenta
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Authenticated View */
                    <>
                        <div className="flex items-start justify-between p-2">
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-[32px] bg-primary/20 overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-xl">
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-primary-dark opacity-30">
                                                <span className="material-symbols-outlined text-4xl">person</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-md border border-slate-50 dark:border-slate-600">
                                        <span className="material-symbols-outlined text-primary-dark text-lg">verified</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black tracking-tight leading-tight">{profile?.full_name || 'Usuario #CHIA'}</h2>
                                    <p className="text-xs text-sage font-bold tracking-wider uppercase">{profile?.email}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsEditing(!isEditing)}
                                className={`size-10 rounded-full flex items-center justify-center transition-colors ${isEditing ? 'bg-primary text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined text-xl">{isEditing ? 'close' : 'edit'}</span>
                            </button>
                        </div>

                        {isEditing ? (
                            /* Edit Mode */
                            <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-dark mb-2">Datos de Entrega</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Nombre Completo</label>
                                        <input 
                                            type="text" 
                                            value={editForm.full_name || ''} 
                                            onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">WhatsApp</label>
                                        <input 
                                            type="tel" 
                                            value={editForm.phone || ''} 
                                            onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                            placeholder="Ej: 2974174655"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Dirección (Rada Tilly)</label>
                                        <input 
                                            type="text" 
                                            value={editForm.address || ''} 
                                            onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                            placeholder="Calle y Número (ej: Moyano 123)"
                                        />
                                    </div>
                                </div>
                                <button 
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    className="w-full bg-primary text-slate-900 font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
                                >
                                    {isSaving ? <div className="size-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" /> : 'Guardar Cambios'}
                                </button>
                            </section>
                        ) : (
                            /* Info Summary */
                            <section className="grid grid-cols-2 gap-3">
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <span className="material-symbols-outlined text-primary-dark text-lg mb-2">local_shipping</span>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Dirección</p>
                                    <p className="text-xs font-bold truncate">{profile?.address || 'No configurada'}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <span className="material-symbols-outlined text-primary-dark text-lg mb-2">call</span>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Teléfono</p>
                                    <p className="text-xs font-bold truncate">{profile?.phone || 'No configurado'}</p>
                                </div>
                            </section>
                        )}
                    </>
                )}

                {/* Menu Groups */}
                <div className="space-y-6">
                    <section>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-2">Actividad</h3>
                        <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700">
                            <Link to="/my-orders" className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-slate-400">assignment</span>
                                    <span className="text-sm font-bold">Mis Reservas</span>
                                </div>
                                <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                            </Link>
                            <div className="h-px bg-slate-50 dark:bg-slate-700" />
                            <button
                                onClick={() => setShowFavorites(!showFavorites)}
                                className={`w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left ${showFavorites ? 'bg-slate-50 dark:bg-slate-700/30' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`material-symbols-outlined ${showFavorites ? 'text-primary' : 'text-slate-400'}`}>favorite</span>
                                    <span className="text-sm font-bold">Favoritos ({favoriteProducts.length})</span>
                                </div>
                                <span className={`material-symbols-outlined text-slate-300 transition-transform ${showFavorites ? 'rotate-90' : ''}`}>chevron_right</span>
                            </button>
                        </div>

                        {/* Favorites Grid */}
                        {showFavorites && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                {favoriteProducts.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {favoriteProducts.map((p: Product) => (
                                            <div key={p.id} className="bg-white dark:bg-slate-800 rounded-3xl p-3 shadow-sm border border-slate-50 dark:border-slate-700 relative group text-left">
                                                <Link to={`/product/${p.id}`} className="block">
                                                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-700 mb-3">
                                                        <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleToggleFavorite(p.id);
                                                            }}
                                                            className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center bg-primary text-slate-900 backdrop-blur shadow-sm transition-all"
                                                        >
                                                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                                                        </button>
                                                    </div>
                                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate mb-1">{p.name}</h3>
                                                </Link>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">${p.price.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                                        <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">favorite</span>
                                        <p className="text-xs text-slate-400 font-medium">No tienes productos guardados</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {isAuthenticated && (
                        <section className="pt-4">
                            <button 
                                onClick={logout}
                                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform mb-4"
                            >
                                <span className="material-symbols-outlined text-lg">logout</span>
                                Cerrar Sesión
                            </button>
                        </section>
                    )}
                </div>

                {/* Secret Admin Entry */}
                <div className="pt-10 pb-6 flex flex-col items-center gap-3">
                    <button
                        onClick={handleLogoClick}
                        className="w-20 h-20 flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity active:scale-90 outline-none"
                    >
                        <img src="/logo.png" alt="#CHIA" className="w-full h-full object-contain" />
                    </button>
                    <p className="text-[10px] text-slate-300 dark:text-slate-700 font-medium tracking-widest uppercase select-none">
                        Versión 1.1.0 - #CHIA
                    </p>
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 w-full bg-white/90 dark:bg-background-dark/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 pb-safe pt-2 z-50">
                <div className="flex justify-around items-center px-2 h-16">
                    <Link to="/shop" className="flex flex-col items-center justify-center gap-1 w-16 group text-sage">
                        <div className="relative p-1.5 rounded-xl transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>home</span>
                        </div>
                        <span className="text-[10px] font-medium">Inicio</span>
                    </Link>
                    <Link to="/catalog" className="flex flex-col items-center justify-center gap-1 w-16 group text-sage">
                        <div className="relative p-1.5 rounded-xl transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>manage_search</span>
                        </div>
                        <span className="text-[10px] font-medium">Catálogo</span>
                    </Link>
                    <Link to="/my-orders" className="flex flex-col items-center justify-center gap-1 w-16 group text-sage">
                        <div className="relative p-1.5 rounded-xl transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>assignment</span>
                        </div>
                        <span className="text-[10px] font-medium">Pedidos</span>
                    </Link>
                    <Link to="/profile" className="flex flex-col items-center justify-center gap-1 w-16 group text-slate-900 dark:text-primary">
                        <div className="relative p-1.5 rounded-xl bg-primary/20 transition-colors border border-primary/10">
                            <span className="material-symbols-outlined" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>person</span>
                        </div>
                        <span className="text-[10px] font-bold">Perfil</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
};

export default Profile;
