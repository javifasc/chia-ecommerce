import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { supabaseService } from '../lib/supabaseService';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

// --- Types ---

import {
    Product,
    CartItem,
    OrderStatus,
    Order,
    HeroPromo,
    FeaturedPromo
} from '../types';

export type {
    Product,
    CartItem,
    OrderStatus,
    Order,
    HeroPromo,
    FeaturedPromo
};

export type State = {
    isLoading: boolean;
    products: Product[];
    cart: CartItem[];
    orders: Order[];
    historyOrders: Order[];
    favorites: string[];
    promotions: {
        hero: HeroPromo;
        featured: FeaturedPromo;
    };
    deliveryFees: {
        [key: string]: number;
    };
    freeShippingThreshold: number;
    hasUnreadOrders: boolean;
    formatWeight: (val: number, isFractional?: boolean) => string;
};

type Action =
    | { type: 'SET_LOADING'; loading: boolean }
    | { type: 'SET_INITIAL_DATA'; data: Partial<State> }
    | { type: 'ADD_TO_CART'; productId: string }
    | { type: 'DECREMENT_CART'; productId: string }
    | { type: 'REMOVE_FROM_CART'; productId: string }
    | { type: 'UPDATE_CART_QUANTITY'; productId: string; quantity: number }
    | { type: 'CLEAR_DELIVERED_ORDERS' }
    | { type: 'UPDATE_DELIVERY_FEES'; fees: { [key: string]: number } }
    | { type: 'UPDATE_ORDER_STATUS'; orderId: string; status: OrderStatus }
    | { type: 'TOGGLE_FAVORITE'; productId: string }
    | { type: 'ADD_PRODUCT'; product: Product }
    | { type: 'EDIT_PRODUCT'; product: Product }
    | { type: 'DELETE_PRODUCT'; productId: string }
    | { type: 'SET_ORDERS'; orders: Order[] }
    | { type: 'SET_PROMOTIONS'; promotions: { hero: HeroPromo; featured: FeaturedPromo } }
    | { type: 'SET_UNREAD_ORDERS'; hasUnread: boolean }
    | { type: 'PLACE_ORDER_LOCAL'; order: Order };

// --- Initial Data ---

const INITIAL_PROMOTIONS = {
    hero: {
        tag: 'Novedad',
        title: 'Cosecha Fresca de Temporada',
        description: 'Obtén un 20% de descuento en orgánicos esta semana.',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1074&auto=format&fit=crop',
        buttonText: 'Comprar Ahora'
    },
    featured: {
        sectionTitle: 'Ofertas Frescas',
        itemTitle: 'Paquete Detox',
        itemDescription: 'Incluye 5 jugos y 2 ensaladas',
        itemImage: 'https://images.unsplash.com/photo-1544306094-e2dca9f57142?q=80&w=600&auto=format&fit=crop',
        price: 35.00,
        oldPrice: 45.00
    }
};

// --- Reducer ---

function storeReducer(state: State, action: Action): State {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.loading };

        case 'SET_INITIAL_DATA':
            return { ...state, ...action.data, isLoading: false };

        case 'SET_ORDERS':
            return {
                ...state,
                orders: action.orders.filter(o => o.status !== 'Entregado'),
                historyOrders: action.orders.filter(o => o.status === 'Entregado')
            };

        case 'SET_PROMOTIONS':
            return { ...state, promotions: action.promotions };

        case 'ADD_TO_CART': {
            const product = state.products.find(p => p.id === action.productId);
            const step = product?.isFractional ? ((product.fractionalStep || 0) / 1000) : 1;
            const existing = state.cart.find(item => item.productId === action.productId);

            if (existing) {
                return {
                    ...state,
                    cart: state.cart.map(item =>
                        item.productId === action.productId
                            ? { ...item, quantity: Number((item.quantity + step).toFixed(3)) }
                            : item
                    ),
                };
            }
            return { ...state, cart: [...state.cart, { productId: action.productId, quantity: step }] };
        }

        case 'DECREMENT_CART': {
            const product = state.products.find(p => p.id === action.productId);
            const step = product?.isFractional ? ((product.fractionalStep || 0) / 1000) : 1;
            const existing = state.cart.find(item => item.productId === action.productId);

            if (!existing) return state;

            const newQty = Number((existing.quantity - step).toFixed(3));
            if (newQty <= 0) {
                return {
                    ...state,
                    cart: state.cart.filter(item => item.productId !== action.productId)
                };
            }

            return {
                ...state,
                cart: state.cart.map(item =>
                    item.productId === action.productId ? { ...item, quantity: newQty } : item
                ),
            };
        }

        case 'UPDATE_CART_QUANTITY': {
            if (action.quantity <= 0) {
                return { ...state, cart: state.cart.filter(item => item.productId !== action.productId) };
            }
            return {
                ...state,
                cart: state.cart.map(item =>
                    item.productId === action.productId ? { ...item, quantity: action.quantity } : item
                ),
            };
        }

        case 'REMOVE_FROM_CART':
            return { ...state, cart: state.cart.filter(item => item.productId !== action.productId) };

        case 'PLACE_ORDER_LOCAL': {
            const updatedProducts = state.products.map(p => {
                const cartItem = action.order.items.find(ci => ci.productId === p.id);
                if (cartItem) {
                    return {
                        ...p,
                        availableStock: p.availableStock - cartItem.quantity,
                        reservedStock: p.reservedStock + cartItem.quantity,
                    };
                }
                return p;
            });

            return {
                ...state,
                products: updatedProducts,
                orders: [action.order, ...state.orders],
                cart: [],
            };
        }

        case 'UPDATE_ORDER_STATUS': {
            const order = [...state.orders, ...state.historyOrders].find(o => o.id === action.orderId);
            if (!order) return state;

            let products = [...state.products];
            if (action.status === 'Entregado') {
                products = products.map(p => {
                    const orderItem = order.items.find(oi => oi.productId === p.id);
                    if (orderItem) {
                        return { ...p, reservedStock: p.reservedStock - orderItem.quantity };
                    }
                    return p;
                });
            }

            const allOrders = [...state.orders, ...state.historyOrders].map(o =>
                o.id === action.orderId ? { ...o, status: action.status } : o
            );

            return {
                ...state,
                products,
                orders: allOrders.filter(o => o.status !== 'Entregado'),
                historyOrders: allOrders.filter(o => o.status === 'Entregado')
            };
        }

        case 'CLEAR_DELIVERED_ORDERS':
            return {
                ...state,
                historyOrders: []
            };

        case 'UPDATE_DELIVERY_FEES': {
            const threshold = action.fees['_FREE_THRESHOLD_'] || 0;
            const cleanFees = { ...action.fees };
            delete cleanFees['_FREE_THRESHOLD_'];
            return {
                ...state,
                deliveryFees: cleanFees,
                freeShippingThreshold: threshold
            };
        }

        case 'TOGGLE_FAVORITE': {
            const isFav = state.favorites.includes(action.productId);
            const favorites = isFav
                ? state.favorites.filter(id => id !== action.productId)
                : [...state.favorites, action.productId];

            localStorage.setItem('chia_favorites', JSON.stringify(favorites));
            return { ...state, favorites };
        }

        case 'ADD_PRODUCT':
            return { ...state, products: [action.product, ...state.products] };

        case 'EDIT_PRODUCT':
            return {
                ...state,
                products: state.products.map(p => p.id === action.product.id ? action.product : p)
            };

        case 'DELETE_PRODUCT':
            return {
                ...state,
                products: state.products.filter(p => p.id !== action.productId),
                favorites: state.favorites.filter(id => id !== action.productId),
                cart: state.cart.filter(item => item.productId !== action.productId)
            };

        case 'SET_UNREAD_ORDERS':
            return { ...state, hasUnreadOrders: action.hasUnread };

        default:
            return state;
    }
}

// --- Context ---

const StoreContext = createContext<{
    state: State;
    dispatch: React.Dispatch<Action>;
    addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
    updateProduct: (product: Product) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    updateStock: (productId: string, adjustment: number) => Promise<void>;
    placeOrder: (data: any) => Promise<string>;
    updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
    updateDeliveryFees: (fees: Record<string, number>) => Promise<void>;
    updatePromotions: (hero?: HeroPromo, featured?: FeaturedPromo) => Promise<void>;
    toggleNewArrival: (productId: string) => Promise<void>;
    markOrdersAsRead: () => void;
    importStockFile: (rows: { codigo: string; nombre: string; familia: string; stock: number; ventaValorizada: number }[], onProgress?: (percent: number) => void) => Promise<{ updated: number; created: number; errors: string[] }>;
    formatWeight: (val: number, isFractional?: boolean) => string;
    refreshProducts: () => Promise<void>;
} | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, user, loading: authLoading } = useAuth();
    const [state, dispatch] = useReducer(storeReducer, {
        isLoading: true,
        products: [],
        cart: [],
        orders: [],
        historyOrders: [],
        favorites: JSON.parse(localStorage.getItem('chia_favorites') || '[]'),
        promotions: INITIAL_PROMOTIONS,
        deliveryFees: {},
        freeShippingThreshold: 0,
        hasUnreadOrders: false,
        formatWeight: (val: number, isFractional?: boolean) => {
            if (!isFractional) return `${val} un.`;
            if (val < 1) return `${Math.round(val * 1000)}gr`;
            return `${val}kg`;
        },
    });

    const publicDataLoaded = useRef(false);

    // EFFECT 1 - load public data, runs ONCE on mount (not on auth changes)
    useEffect(() => {
        const safetyTimeout = setTimeout(() => {
            if (!publicDataLoaded.current) {
                console.warn('Safety timeout reached: forcing isLoading to false.');
                dispatch({ type: 'SET_LOADING', loading: false });
            }
        }, 10000);

        const loadPublicData = async (retryCount = 0) => {
            if (retryCount === 0) dispatch({ type: 'SET_LOADING', loading: true });

            try {
                const [products, fees, promos] = await Promise.all([
                    supabaseService.getProducts(),
                    supabaseService.getDeliveryFees(),
                    supabaseService.getPromotions()
                ]);

                const threshold = fees['_FREE_THRESHOLD_'] || 0;
                const cleanFees = { ...fees };
                delete cleanFees['_FREE_THRESHOLD_'];

                dispatch({
                    type: 'SET_INITIAL_DATA',
                    data: {
                        products,
                        deliveryFees: cleanFees,
                        freeShippingThreshold: threshold,
                        promotions: promos
                    }
                });
                publicDataLoaded.current = true;
                clearTimeout(safetyTimeout);
            } catch (error) {
                console.error(`Error loading public data (Attempt ${retryCount + 1}):`, error);
                
                const anyError = error as any;
                const errorStr = String(anyError && anyError.message || anyError || '').toLowerCase();
                const isAuthError = (anyError && anyError.status === 401) || 
                                    errorStr.includes('jwt') || 
                                    errorStr.includes('token') || 
                                    errorStr.includes('unauthorized') ||
                                    errorStr.includes('claims');

                if (isAuthError) {
                    console.warn('JWT/Auth error detected while loading public data. Clearing session to fallback to anonymous access.');
                    try {
                        await supabase.auth.signOut();
                    } catch (e) {
                        localStorage.removeItem('chia-auth-token');
                    }
                    setTimeout(() => loadPublicData(retryCount + 1), 100);
                    return;
                }
                
                if (retryCount < 2) {
                    setTimeout(() => loadPublicData(retryCount + 1), 1000);
                    return;
                }
                
                dispatch({ type: 'SET_LOADING', loading: false });
            }
        };

        loadPublicData();

        // Channels for public data with debouncing
        let productsTimeout: NodeJS.Timeout | null = null;
        const productsChannel = supabase
            .channel('products-realtime')
            .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'products' }, () => {
                if (productsTimeout) clearTimeout(productsTimeout);
                productsTimeout = setTimeout(async () => {
                    try {
                        const products = await supabaseService.getProducts();
                        dispatch({ type: 'SET_INITIAL_DATA', data: { products } });
                    } catch (err) {
                        console.error('Error refreshing products in realtime:', err);
                    }
                }, 1000); // 1-second debounce to handle bulk imports smoothly
            })
            .subscribe();

        const promoChannel = supabase
            .channel('promos-realtime')
            .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'promotions' }, async () => {
                const promos = await supabaseService.getPromotions();
                dispatch({ type: 'SET_PROMOTIONS', promotions: promos });
            })
            .subscribe();

        const feesChannel = supabase
            .channel('fees-realtime')
            .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'delivery_fees' }, async () => {
                const fees = await supabaseService.getDeliveryFees();
                dispatch({ type: 'UPDATE_DELIVERY_FEES', fees });
            })
            .subscribe();

        return () => {
            clearTimeout(safetyTimeout);
            supabase.removeChannel(productsChannel);
            supabase.removeChannel(promoChannel);
            supabase.removeChannel(feesChannel);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // EFFECT 2 - load orders, runs when auth changes
    useEffect(() => {
        if (authLoading) return;

        const loadOrders = async () => {
            try {
                const isAdmin = window.location.pathname.startsWith('/admin');
                if (isAdmin || user?.id) {
                    const orders = await supabaseService.getOrders(isAdmin ? undefined : user?.id);
                    dispatch({
                        type: 'SET_ORDERS',
                        orders: orders || []
                    });
                } else {
                    dispatch({
                        type: 'SET_ORDERS',
                        orders: []
                    });
                }
            } catch (orderErr) {
                console.warn('Could not load orders:', orderErr);
            }
        };

        loadOrders();

        // Subscribe to orders/items realtime updates
        const ordersChannel = supabase
            .channel('orders-realtime')
            .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'orders' }, async (payload: any) => {
                console.log('Realtime Order Change:', payload.eventType);
                setTimeout(async () => {
                    const isAdmin = window.location.pathname.startsWith('/admin');
                    if (isAdmin || user?.id) {
                        const orders = await supabaseService.getOrders(isAdmin ? undefined : user?.id);
                        dispatch({ type: 'SET_ORDERS', orders });
                    } else {
                        dispatch({ type: 'SET_ORDERS', orders: [] });
                    }
                }, 100);

                if (payload.eventType === 'INSERT') {
                    dispatch({ type: 'SET_UNREAD_ORDERS', hasUnread: true });
                    try {
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                        audio.play().catch(() => console.log('Sound blocked by browser interaction policy'));
                    } catch (e) {
                        console.error('Error playing notification:', e);
                    }
                }
            })
            .subscribe();

        const itemsChannel = supabase
            .channel('items-realtime')
            .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'order_items' }, async () => {
                const isAdmin = window.location.pathname.startsWith('/admin');
                if (isAdmin || user?.id) {
                    const orders = await supabaseService.getOrders(isAdmin ? undefined : user?.id);
                    dispatch({ type: 'SET_ORDERS', orders });
                } else {
                    dispatch({ type: 'SET_ORDERS', orders: [] });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(ordersChannel);
            supabase.removeChannel(itemsChannel);
        };
    }, [authLoading, isAuthenticated, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const addProduct = async (product: Omit<Product, 'id'>) => {
        const data = await supabaseService.addProduct(product);
        const newProduct: Product = {
            id: data.id,
            codigo: data.codigo,
            name: data.name,
            description: data.description,
            fullDescription: data.full_description,
            price: Number(data.price),
            category: data.category,
            subcategory: data.subcategory,
            image: data.image,
            unit: data.unit,
            availableStock: Number(data.available_stock),
            reservedStock: Number(data.reserved_stock),
            isFractional: data.is_fractional,
            fractionalStep: Number(data.fractional_step || 1),
            badges: data.badges,
            nutritionalInfo: data.nutritional_info,
            isNewArrival: data.is_new_arrival
        };
        dispatch({ type: 'ADD_PRODUCT', product: newProduct });
    };

    const updateProduct = async (product: Product) => {
        await supabaseService.updateProduct(product);
        dispatch({ type: 'EDIT_PRODUCT', product });
    };

    const deleteProduct = async (id: string) => {
        await supabaseService.deleteProduct(id);
    };

    const updateStock = async (productId: string, adjustment: number) => {
        const product = state.products.find(p => p.id === productId);
        if (!product) return;

        const updatedProduct = {
            ...product,
            availableStock: Number((product.availableStock + adjustment).toFixed(3))
        };

        // Optimistic local update
        dispatch({ type: 'EDIT_PRODUCT', product: updatedProduct });

        try {
            await supabaseService.updateProduct(updatedProduct);
        } catch (error) {
            // Revert on error
            console.error('Failed to update stock in Supabase, reverting local state:', error);
            dispatch({ type: 'EDIT_PRODUCT', product });
            throw error;
        }
    };

    const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
        await supabaseService.updateOrderStatus(orderId, status);
        dispatch({ type: 'UPDATE_ORDER_STATUS', orderId, status });
    };

    const updateDeliveryFees = async (fees: Record<string, number>) => {
        await supabaseService.updateDeliveryFees(fees);
    };

    const updatePromotions = async (hero?: HeroPromo, featured?: FeaturedPromo) => {
        await supabaseService.updatePromotions(hero, featured);
        dispatch({
            type: 'SET_PROMOTIONS',
            promotions: {
                hero: hero || state.promotions.hero,
                featured: featured || state.promotions.featured
            }
        });
    };

    const toggleNewArrival = async (productId: string) => {
        const product = state.products.find(p => p.id === productId);
        if (!product) return;

        const updatedProduct = { ...product, isNewArrival: !product.isNewArrival };
        await supabaseService.updateProduct(updatedProduct);
        dispatch({ type: 'EDIT_PRODUCT', product: updatedProduct });
    };

    const markOrdersAsRead = () => {
        dispatch({ type: 'SET_UNREAD_ORDERS', hasUnread: false });
    };

    const placeOrder = async (orderData: any): Promise<string> => {
        const orderItems = state.cart.map(cartItem => {
            const product = state.products.find(p => p.id === cartItem.productId)!;
            return { ...cartItem, name: product.name, price: product.price };
        });

        const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const deliveryFee = orderData.deliveryFee || 0;
        const total = subtotal + deliveryFee;

        const orderId = await supabaseService.createOrder({
            ...orderData,
            status: 'Pendiente',
            items: orderItems,
            total
        });

        const newOrder: Order = {
            id: orderId,
            ...orderData,
            items: orderItems,
            total,
            status: 'Pendiente',
            createdAt: new Date().toISOString()
        };

        dispatch({ type: 'PLACE_ORDER_LOCAL', order: newOrder });
        return orderId;
    };

    const importStockFile = async (rows: { codigo: string; nombre: string; familia: string; stock: number; ventaValorizada: number }[], onProgress?: (percent: number) => void) => {
        const result = await supabaseService.bulkUpsertFromImport(rows, onProgress);
        // Refresh products after import
        const products = await supabaseService.getProducts();
        dispatch({ type: 'SET_INITIAL_DATA', data: { products } });
        return result;
    };

    const refreshProducts = async () => {
        const products = await supabaseService.getProducts();
        dispatch({ type: 'SET_INITIAL_DATA', data: { products } });
    };

    return (
        <StoreContext.Provider value={{
            state, dispatch, addProduct, updateProduct, deleteProduct, updateStock,
            placeOrder, updateOrderStatus, updateDeliveryFees, updatePromotions, importStockFile,
            toggleNewArrival,
            markOrdersAsRead,
            formatWeight: state.formatWeight,
            refreshProducts
        }}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error('useStore must be used within StoreProvider');
    return context;
};
