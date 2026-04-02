import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

export type ProfileData = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    avatar_url: string | null;
};

type AuthContextType = {
    isAuthenticated: boolean;
    user: User | null;
    profile: ProfileData | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
    logout: () => Promise<void>;
    updateProfile: (data: Partial<ProfileData>) => Promise<{ error: any }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);

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
        }
    };

    useEffect(() => {
        let mounted = true;

        // Safety timeout: if auth takes more than 5 seconds, stop loading
        const timeout = setTimeout(() => {
            if (mounted) setLoading(false);
        }, 5000);

        // Listen for changes on auth state (includes initial session)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;

            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setIsAuthenticated(!!session);
            
            if (currentUser) {
                await fetchProfile(currentUser.id);
            } else {
                setProfile(null);
            }
            
            setLoading(false);
            clearTimeout(timeout);
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

    const updateProfile = async (data: Partial<ProfileData>) => {
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
            loading, 
            login, 
            signUp, 
            logout, 
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
