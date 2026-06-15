import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'src', 'lib', 'supabaseService.ts');

if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf-8');

// Normalize line endings to LF for consistent replacement
content = content.replace(/\r\n/g, '\n');

// 1. Patch getOrders()
const oldGetOrders = `    // --- Orders ---
    async getOrders(): Promise<Order[]> {
        const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .order('created_at', { ascending: false });`;

const newGetOrders = `    // --- Orders ---
    async getOrders(userId?: string): Promise<Order[]> {
        let query = supabase
            .from('orders')
            .select('*, order_items(*)');

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });`;

if (!content.includes(oldGetOrders)) {
    console.error('Error: Could not find getOrders code block in supabaseService.ts');
    process.exit(1);
}

content = content.replace(oldGetOrders, newGetOrders);

// 2. Patch createOrder()
const oldCreateOrder = `    async createOrder(order: Omit<Order, 'id' | 'createdAt'>) {
        const orderId = \`#ORD-\${Math.floor(Math.random() * 9000) + 1000}\`;
        const { error: orderError } = await supabase
            .from('orders')
            .insert([{
                id: orderId,
                customer_name: order.customerName,
                customer_phone: order.customerPhone,
                total: order.total,
                status: order.status,
                delivery_method: order.deliveryMethod,
                delivery_zone: order.deliveryZone,
                delivery_fee: order.deliveryFee,
                address: order.address
            }]);`;

const newCreateOrder = `    async createOrder(order: Omit<Order, 'id' | 'createdAt'>) {
        const orderId = \`#ORD-\${Math.floor(Math.random() * 9000) + 1000}\`;
        
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || null;

        const { error: orderError } = await supabase
            .from('orders')
            .insert([{
                id: orderId,
                customer_name: order.customerName,
                customer_phone: order.customerPhone,
                total: order.total,
                status: order.status,
                delivery_method: order.deliveryMethod,
                delivery_zone: order.deliveryZone,
                delivery_fee: order.deliveryFee,
                address: order.address,
                user_id: userId
            }]);`;

if (!content.includes(oldCreateOrder)) {
    console.error('Error: Could not find createOrder code block in supabaseService.ts');
    process.exit(1);
}

content = content.replace(oldCreateOrder, newCreateOrder);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('supabaseService.ts patched successfully!');
