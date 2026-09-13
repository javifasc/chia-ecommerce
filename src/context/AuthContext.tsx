import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, isAuthTokenError, purgeStaleSession } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

export type ProfileData = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    avatar_url: string | null;
    role: 'customer' | 'admin';
};

type AuthContextType = {
    isAuthenticated: boolean;
    user: User | null;
    profile: ProfileData | null;
    isAdmin: boolean;
    loading: boolean;
    /** El perfil llega después de la sesión. Sin esto, el admin recién logueado
     *  aparecería como cliente durante un instante y lo echaríamos del panel. */
    profileLoading: boolean;
    login: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
    logout: () => Promise<void>;
    signInWithGoogle: () => Promise<{ error: any }>;
    updateProfile: (data: Partial<Omit<ProfileData, 'id' | 'role'>>) => Promise<{ error: any }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);

    // Se limpia la sesión corrupta como mucho una vez por montaje.
    const sessionPurged = useRef(false);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
            setProfile(null);

            // Esta consulta es el canario de la sesión: es la primera que viaja con el JWT
            // del usuario. Si el servidor no lo puede validar (vencido, o firmado con una
            // clave que ya rotó), la sesión guardada quedó inservible y envenenaría todos
            // los pedidos siguientes. La limpiamos para que la app siga andando como
            // anónima, sin que el usuario tenga que borrar cookies a mano.
            if (!sessionPurged.current && isAuthTokenError(error)) {
                sessionPurged.current = true;
                console.warn('Sesión inválida detectada al leer el perfil. Limpiando storage.');
                await purgeStaleSession();
            }
        } finally {
            setProfileLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;

        // Safety timeout: if auth takes more than 5 seconds, stop loading
        const timeout = setTimeout(() => {
            if (mounted) setLoading(false);
        }, 5000);

        // Listen for changes on auth state (includes initial session)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;

            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setIsAuthenticated(!!session);
            setLoading(false);
            clearTimeout(timeout);

            if (!currentUser) {
                setProfile(null);
                setProfileLoading(false);
                return;
            }

            // Se marca antes de salir del callback: entre este punto y el fetch de abajo
            // no debe existir un instante en el que un admin figure como cliente.
            setProfileLoading(true);

            // Supabase ejecuta este callback con el lock de auth tomado y espera a que
            // termine. Llamar a la API de Supabase acá adentro serializa (y puede trabar)
            // todo el sistema de auth, así que el perfil se pide fuera del callback.
            setTimeout(() => {
                if (mounted) fetchProfile(currentUser.id);
            }, 0);
        });

        return () => {
            mounted = false;
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string) => {
        const result = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error: result.error };
    };

    const signUp = async (email: string, password: string, fullName: string) => {
        const result = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                }
            }
        });
        return { error: result.error };
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setProfile(null);
    };

    const signInWithGoogle = async () => {
        const result = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
        return { error: result.error };
    };

    const updateProfile = async (data: Partial<Omit<ProfileData, 'id' | 'role'>>) => {
        if (!user) return { error: new Error('No user logged in') };

        const { error } = await supabase
            .from('profiles')
            .update(data)
            .eq('id', user.id);

        if (!error) {
            await fetchProfile(user.id);
        }

        return { error };
    };

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            user,
            profile,
            isAdmin: profile?.role === 'admin',
            loading,
            profileLoading,
            login,
            signUp, 
            logout, 
            signInWithGoogle,
            updateProfile 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
