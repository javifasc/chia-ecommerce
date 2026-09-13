import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Home from './pages/Home';
import Cart from './pages/Cart';
import BuyerOrders from './pages/BuyerOrders';
import Catalog from './pages/Catalog';
import Profile from './pages/Profile';
import ProductDetail from './pages/ProductDetail';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import { ProtectedRoute } from './components/ProtectedRoute';
import WhatsAppFAB from './components/WhatsAppFAB';

/**
 * El panel de administración carga en diferido: arrastra recharts y xlsx,
 * que no tienen por qué descargarse en el teléfono de un cliente.
 */
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const OrderManagement = lazy(() => import('./pages/OrderManagement'));
const OrderHistory = lazy(() => import('./pages/OrderHistory'));
const Inventory = lazy(() => import('./pages/Inventory'));
const ProductUpload = lazy(() => import('./pages/ProductUpload'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminPromotions = lazy(() => import('./pages/AdminPromotions'));
const SuggestionsAdmin = lazy(() => import('./pages/SuggestionsAdmin'));

const RouteFallback = () => (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-500">Cargando...</p>
        </div>
    </div>
);

function App() {
    return (
        <Router>
            <WhatsAppFAB />
            <Suspense fallback={<RouteFallback />}>
                <Routes>
                    {/* New Landing Page */}
                    <Route path="/" element={<LandingPage />} />

                    {/* User Storefront relocated */}
                    <Route path="/shop" element={<Home />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/my-orders" element={<BuyerOrders />} />
                    <Route path="/catalog" element={<Catalog />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Admin Secret Login */}
                    <Route path="/admin/login" element={<AdminLogin />} />

                    {/* Protected Admin Management */}
                    <Route path="/admin" element={
                        <ProtectedRoute>
                            <AdminDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/orders" element={
                        <ProtectedRoute>
                            <OrderManagement />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/orders/history" element={
                        <ProtectedRoute>
                            <OrderHistory />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/inventory" element={
                        <ProtectedRoute>
                            <Inventory />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/upload" element={
                        <ProtectedRoute>
                            <ProductUpload />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/edit/:id" element={
                        <ProtectedRoute>
                            <ProductUpload />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/promotions" element={
                        <ProtectedRoute>
                            <AdminPromotions />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/suggestions" element={
                        <ProtectedRoute>
                            <SuggestionsAdmin />
                        </ProtectedRoute>
                    } />
                </Routes>
            </Suspense>
        </Router>
    );
}

export default App;
