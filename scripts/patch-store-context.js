import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'src', 'context', 'StoreContext.tsx');

if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf-8');

// Normalize line endings to LF for consistent replacement
content = content.replace(/\r\n/g, '\n');

// 1. Destructure user from useAuth()
const target1 = `export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();`;

const replacement1 = `export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, user } = useAuth();`;

if (!content.includes(target1)) {
    console.error('Error: Could not find target1 in StoreContext.tsx');
    process.exit(1);
}
content = content.replace(target1, replacement1);

// 2. Patch loadData orders fetch
const target2 = `                // Then try to load private data (orders)
                try {
                    const orders = await supabaseService.getOrders();
                    dispatch({
                        type: 'SET_ORDERS',
                        orders: orders || []
                    });
                } catch (orderErr) {
                    console.warn('Could not load orders (Auth might be locked or unauthenticated):', orderErr);
                }`;

const replacement2 = `                // Then try to load private data (orders)
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
                    console.warn('Could not load orders (Auth might be locked or unauthenticated):', orderErr);
                }`;

if (!content.includes(target2)) {
    console.error('Error: Could not find target2 in StoreContext.tsx');
    process.exit(1);
}
content = content.replace(target2, replacement2);

// 3. Patch orders-realtime callback
const target3 = `                // Debounce/Delay fetch slightly to give order_items time to insert if it's a new order
                setTimeout(async () => {
                    const orders = await supabaseService.getOrders();
                    dispatch({ type: 'SET_ORDERS', orders });
                }, 100);`;

const replacement3 = `                // Debounce/Delay fetch slightly to give order_items time to insert if it's a new order
                setTimeout(async () => {
                    const isAdmin = window.location.pathname.startsWith('/admin');
                    if (isAdmin || user?.id) {
                        const orders = await supabaseService.getOrders(isAdmin ? undefined : user?.id);
                        dispatch({ type: 'SET_ORDERS', orders });
                    } else {
                        dispatch({ type: 'SET_ORDERS', orders: [] });
                    }
                }, 100);`;

if (!content.includes(target3)) {
    console.error('Error: Could not find target3 in StoreContext.tsx');
    process.exit(1);
}
content = content.replace(target3, replacement3);

// 4. Patch items-realtime callback
const target4 = `        const itemsChannel = supabase
            .channel('items-realtime')
            .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'order_items' }, async () => {
                const orders = await supabaseService.getOrders();
                dispatch({ type: 'SET_ORDERS', orders });
            })
            .subscribe();`;

const replacement4 = `        const itemsChannel = supabase
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
            .subscribe();`;

if (!content.includes(target4)) {
    console.error('Error: Could not find target4 in StoreContext.tsx');
    process.exit(1);
}
content = content.replace(target4, replacement4);

// 5. Patch dependency array
const target5 = `        return () => {
            supabase.removeChannel(ordersChannel);
            supabase.removeChannel(itemsChannel);
            supabase.removeChannel(productsChannel);
            supabase.removeChannel(promoChannel);
            supabase.removeChannel(feesChannel);
        };
    }, [isAuthenticated]);`;

const replacement5 = `        return () => {
            supabase.removeChannel(ordersChannel);
            supabase.removeChannel(itemsChannel);
            supabase.removeChannel(productsChannel);
            supabase.removeChannel(promoChannel);
            supabase.removeChannel(feesChannel);
        };
    }, [isAuthenticated, user]);`;

if (!content.includes(target5)) {
    console.error('Error: Could not find target5 in StoreContext.tsx');
    process.exit(1);
}
content = content.replace(target5, replacement5);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('StoreContext.tsx patched successfully!');
