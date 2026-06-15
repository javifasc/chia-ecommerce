import { supabase } from './supabaseClient';
import { Product, Order, HeroPromo, FeaturedPromo, ProductSuggestion } from '../types';
import { findParentCategory } from '../utils/categoryMapping';

export const supabaseService = {
    // --- Products ---
    async getProducts(): Promise<Product[]> {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map snake_case to camelCase
        return (data || []).map(p => ({
            id: p.id,
            codigo: p.codigo,
            name: p.name,
            description: p.description,
            fullDescription: p.full_description,
            price: Number(p.price),
            category: p.category,
            subcategory: p.subcategory,
            image: p.image || '/logo.png',
            unit: p.unit,
            availableStock: Number(p.available_stock),
            reservedStock: Number(p.reserved_stock),
            isFractional: p.is_fractional,
            fractionalStep: Number(p.fractional_step || 1),
            badges: p.badges,
            nutritionalInfo: p.nutritional_info,
            isNewArrival: p.is_new_arrival
        }));
    },

    async addProduct(product: Omit<Product, 'id'>) {
        const { data, error } = await supabase
            .from('products')
            .insert([{
                codigo: product.codigo,
                name: product.name,
                description: product.description,
                full_description: product.fullDescription,
                price: product.price,
                category: product.category,
                subcategory: product.subcategory,
                image: product.image,
                unit: product.unit,
                available_stock: product.availableStock,
                reserved_stock: product.reservedStock,
                is_fractional: product.isFractional,
                fractional_step: product.fractionalStep,
                badges: product.badges,
                nutritional_info: product.nutritionalInfo,
                is_new_arrival: product.isNewArrival
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateProduct(product: Product) {
        const { error } = await supabase
            .from('products')
            .update({
                codigo: product.codigo,
                name: product.name,
                description: product.description,
                full_description: product.fullDescription,
                price: product.price,
                category: product.category,
                subcategory: product.subcategory,
                image: product.image,
                unit: product.unit,
                available_stock: product.availableStock,
                reserved_stock: product.reservedStock,
                is_fractional: product.isFractional,
                fractional_step: product.fractionalStep,
                badges: product.badges,
                nutritional_info: product.nutritionalInfo,
                is_new_arrival: product.isNewArrival
            })
            .eq('id', product.id);

        if (error) throw error;
    },

    async deleteProduct(id: string) {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Orders ---
    async getOrders(userId?: string): Promise<Order[]> {
        let query = supabase
            .from('orders')
            .select('*, order_items(*)');

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(o => ({
            id: o.id,
            customerName: o.customer_name,
            customerPhone: o.customer_phone,
            status: o.status,
            total: o.total,
            createdAt: o.created_at,
            deliveryMethod: o.delivery_method,
            deliveryZone: o.delivery_zone,
            deliveryFee: o.delivery_fee,
            address: o.address,
            items: o.order_items.map((i: any) => ({
                productId: i.product_id,
                quantity: i.quantity,
                name: i.name,
                price: i.price
            }))
        }));
    },

    async createOrder(order: Omit<Order, 'id' | 'createdAt'>) {
        const orderId = `#ORD-${Math.floor(Math.random() * 9000) + 1000}`;
        
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
            }]);

        if (orderError) throw orderError;

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(order.items.map(item => ({
                order_id: orderId,
                product_id: item.productId,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })));

        if (itemsError) throw itemsError;

        // Update stock for all items
        for (const item of order.items) {
            const { data: p } = await supabase.from('products').select('available_stock, reserved_stock').eq('id', item.productId).single();
            if (p) {
                await supabase.from('products').update({
                    available_stock: p.available_stock - item.quantity,
                    reserved_stock: p.reserved_stock + item.quantity
                }).eq('id', item.productId);
            }
        }

        return orderId;
    },

    async updateOrderStatus(orderId: string, status: string) {
        const { error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', orderId);

        if (error) throw error;

        // If delivered, decrease reserved stock
        if (status === 'Entregado') {
            const { data: items } = await supabase.from('order_items').select('product_id, quantity').eq('order_id', orderId);
            if (items) {
                for (const item of items) {
                    const { data: p } = await supabase.from('products').select('reserved_stock').eq('id', item.product_id).single();
                    if (p) {
                        await supabase.from('products').update({
                            reserved_stock: p.reserved_stock - item.quantity
                        }).eq('id', item.product_id);
                    }
                }
            }
        }
    },

    // --- Delivery Fees ---
    async getDeliveryFees(): Promise<Record<string, number>> {
        const { data, error } = await supabase.from('delivery_fees').select('*');
        if (error) throw error;

        const fees: Record<string, number> = {};
        data?.forEach(f => { fees[f.zone] = f.fee; });
        return fees;
    },

    async updateDeliveryFees(fees: Record<string, number>) {
        for (const [zone, fee] of Object.entries(fees)) {
            await supabase.from('delivery_fees').upsert({ zone, fee });
        }
    },

    // --- Promotions ---
    async getPromotions(): Promise<{ hero: HeroPromo; featured: FeaturedPromo }> {
        const { data, error } = await supabase.from('promotions').select('*');
        if (error) throw error;

        const hero = data?.find(p => p.id === 'hero')?.data || {};
        const featured = data?.find(p => p.id === 'featured')?.data || {};

        return { hero, featured };
    },

    async updatePromotions(hero?: HeroPromo, featured?: FeaturedPromo) {
        if (hero) {
            const { error } = await supabase.from('promotions').upsert({ id: 'hero', data: hero });
            if (error) throw error;
        }
        if (featured) {
            const { error } = await supabase.from('promotions').upsert({ id: 'featured', data: featured });
            if (error) throw error;
        }
    },

    // --- Bulk Import from XLSX ---
    async bulkUpsertFromImport(rows: { codigo: string; nombre: string; familia: string; stock: number; ventaValorizada: number }[]): Promise<{ updated: number; created: number; errors: string[] }> {
        let updated = 0;
        let created = 0;
        const errors: string[] = [];

        for (const row of rows) {
            try {
                // Check if product with this codigo already exists
                const { data: existing } = await supabase
                    .from('products')
                    .select('id')
                    .eq('codigo', row.codigo)
                    .maybeSingle();

                if (existing) {
                    // Calculate category and subcategory
                    const subcategory = row.familia || 'GENERAL';
                    const category = findParentCategory(subcategory);

                    // UPDATE existing product (price + stock + categorization)
                    const { error } = await supabase
                        .from('products')
                        .update({
                            price: row.ventaValorizada,
                            available_stock: row.stock, // stock already parsed as number in xlsxParser
                            name: row.nombre,
                            category: category,
                            subcategory: subcategory
                        })
                        .eq('codigo', row.codigo);

                    if (error) {
                        errors.push(`Error actualizando ${row.codigo}: ${error.message}`);
                    } else {
                        updated++;
                    }
                } else {
                    // Calculate category and subcategory
                    const subcategory = row.familia || 'GENERAL';
                    const category = findParentCategory(subcategory);

                    // CREATE new product
                    const { error } = await supabase
                        .from('products')
                        .insert([{
                            codigo: row.codigo,
                            name: row.nombre,
                            description: row.nombre,
                            price: row.ventaValorizada,
                            category: category,
                            subcategory: subcategory,
                            image: '',
                            unit: 'un.',
                            available_stock: row.stock,
                            reserved_stock: 0
                        }]);

                    if (error) {
                        errors.push(`Error creando ${row.codigo}: ${error.message}`);
                    } else {
                        created++;
                    }
                }
            } catch (err: any) {
                errors.push(`Error en ${row.codigo}: ${err.message}`);
            }
        }

        return { updated, created, errors };
    },

    // --- Product Suggestions ---
    async submitSuggestion(text: string) {
        const cleanText = text.trim();
        if (!cleanText) return;

        // Try to find existing suggestion (case insensitive)
        const { data: existing } = await supabase
            .from('product_suggestions')
            .select('*')
            .ilike('text', cleanText)
            .maybeSingle();

        if (existing) {
            await supabase
                .from('product_suggestions')
                .update({ count: (existing.count || 1) + 1 })
                .eq('id', existing.id);
        } else {
            await supabase
                .from('product_suggestions')
                .insert([{ text: cleanText, count: 1, status: 'pending' }]);
        }
    },

    async getSuggestions(): Promise<ProductSuggestion[]> {
        const { data, error } = await supabase
            .from('product_suggestions')
            .select('*')
            .order('count', { ascending: false });

        if (error) throw error;

        return (data || []).map(s => ({
            id: s.id,
            text: s.text,
            count: s.count,
            createdAt: s.created_at,
            status: s.status as any
        }));
    },

    async deleteSuggestion(id: string) {
        const { error } = await supabase
            .from('product_suggestions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
