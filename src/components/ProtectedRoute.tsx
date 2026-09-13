import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Spinner = () => (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="size-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
);

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, isAdmin, loading, profileLoading } = useAuth();
    const location = useLocation();

    // Hay que esperar también al perfil: el rol viene de ahí, y sin esta espera un
    // admin recién logueado se vería como cliente por un instante y lo mandaríamos
    // de vuelta a la tienda.
    if (loading || (isAuthenticated && profileLoading)) {
        return <Spinner />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    // Estar logueado ya no alcanza para entrar al panel: antes cualquier cliente
    // registrado podía escribir /admin en la barra de direcciones y entrar.
    // A la pantalla de login no lo mandamos, porque ya tiene sesión y volvería acá.
    if (!isAdmin) {
        return <Navigate to="/shop" replace />;
    }

    return <>{children}</>;
};
