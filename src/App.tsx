import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Cart from './pages/Cart';
import AdminDashboard from './pages/AdminDashboard';
import OrderManagement from './pages/OrderManagement';
import OrderHistory from './pages/OrderHistory';
import Inventory from './pages/Inventory';
import ProductUpload from './pages/ProductUpload';
import AdminLogin from './pages/AdminLogin';
import AdminPromotions from './pages/AdminPromotions';
import BuyerOrders from './pages/BuyerOrders';
import Catalog from './pages/Catalog';
import Profile from './pages/Profile';
import ProductDetail from './pages/ProductDetail';
import SuggestionsAdmin from './pages/SuggestionsAdmin';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import { ProtectedRoute } from './components/ProtectedRoute';
import WhatsAppFAB from './components/WhatsAppFAB';

function App() {
    return (
        <Router>
            <WhatsAppFAB />
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
        </Router>
    );
}

export default App;
