import { supabase, supabasePublic } from './supabaseClient';
import { Product, Order, HeroPromo, FeaturedPromo, InstagramPromo, ProductSuggestion } from '../types';
import { findParentCategory } from '../utils/categoryMapping';

export type ImportRecord = {
    id: string;
    createdAt: string;
    updated: number;
    created: number;
    undoneAt: string | null;
};

export const supabaseService = {
    // --- Products ---
    // Lectura pública: usa supabasePublic para que una sesión vencida nunca bloquee el catálogo.
    async getProducts(): Promise<Product[]> {
        const { data, error } = await supabasePublic
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
            items: (o.order_items || []).map((i: any) => ({
                productId: i.product_id,
                quantity: i.quantity,
                name: i.name,
                price: i.price
            }))
        }));
    },

    // El pedido se arma entero del lado del servidor (función place_order).
    // Antes el navegador insertaba la orden, los ítems y después descontaba el stock
    // uno por uno, mandando él mismo los precios: eso obligaba a dejar la tabla
    // products escribible por cualquiera y permitía comprar a precio $0 tocando el JS.
    // Ahora los precios y el envío salen de la base, se valida el stock y todo ocurre
    // en una sola transacción.
    async createOrder(order: Omit<Order, 'id' | 'createdAt'>): Promise<string> {
        const { data, error } = await supabase.rpc('place_order', {
            p_customer_name: order.customerName,
            p_customer_phone: order.customerPhone,
            p_delivery_method: order.deliveryMethod,
            p_delivery_zone: order.deliveryZone ?? null,
            p_address: order.address ?? null,
            p_items: order.items.map(item => ({
                product_id: item.productId,
                quantity: item.quantity
            }))
        });

        if (error) throw error;
        return data as string;
    },

    async updateOrderStatus(orderId: string, status: string) {
        const { data, error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', orderId)
            .select('id');

        // El stock lo mueve el trigger orders_status_stock de la base
        // (supabase_stock_estados.sql): no hay que tocarlo desde acá.
        if (error) throw error;
        // Si la política de seguridad no deja actualizar (sesión vencida, no es admin),
        // la base no da error: simplemente no cambia ninguna fila.
        if (!data || data.length === 0) {
            throw new Error('No se pudo guardar el cambio. Volvé a iniciar sesión e intentá de nuevo.');
        }
    },

    // --- Delivery Fees ---
    // Lectura pública: ver nota en getProducts.
    async getDeliveryFees(): Promise<Record<string, number>> {
        const { data, error } = await supabasePublic.from('delivery_fees').select('*');
        if (error) throw error;

        const fees: Record<string, number> = {};
        data?.forEach(f => { fees[f.zone] = f.fee; });
        return fees;
    },

    // Todo en una sola llamada. Antes se guardaba zona por zona y los errores se
    // ignoraban: si fallaba, el panel no se enteraba.
    async updateDeliveryFees(fees: Record<string, number>) {
        const rows = Object.entries(fees).map(([zone, fee]) => ({ zone, fee }));
        const { data, error } = await supabase
            .from('delivery_fees')
            .upsert(rows)
            .select('zone');

        // 42501 = la política de seguridad lo rechazó (sesión vencida o no es admin).
        if (error && error.code !== '42501') throw error;
        if (error || !data || data.length !== rows.length) {
            throw new Error('No se pudo guardar. Volvé a iniciar sesión e intentá de nuevo.');
        }
    },

    // --- Promotions ---
    // Lectura pública: ver nota en getProducts.
    async getPromotions(): Promise<{ hero: HeroPromo; featured: FeaturedPromo; instagram: InstagramPromo }> {
        const { data, error } = await supabasePublic.from('promotions').select('*');
        if (error) throw error;

        const hero = data?.find(p => p.id === 'hero')?.data || {};
        const featured = data?.find(p => p.id === 'featured')?.data || {};

        // La fila 'instagram' puede no existir todavía: se crea al guardar
        // por primera vez desde el panel, sin migración de esquema.
        const savedPosts = data?.find(p => p.id === 'instagram')?.data?.posts;
        const instagram: InstagramPromo = {
            posts: Array.isArray(savedPosts) ? savedPosts.filter((c: unknown) => typeof c === 'string') : [],
        };

        return { hero, featured, instagram };
    },

    async updatePromotions(hero?: HeroPromo, featured?: FeaturedPromo, instagram?: InstagramPromo) {
        if (hero) {
            const { error } = await supabase.from('promotions').upsert({ id: 'hero', data: hero });
            if (error) throw error;
        }
        if (featured) {
            const { error } = await supabase.from('promotions').upsert({ id: 'featured', data: featured });
            if (error) throw error;
        }
        if (instagram) {
            const { error } = await supabase.from('promotions').upsert({ id: 'instagram', data: instagram });
            if (error) throw error;
        }
    },

    // --- Bulk Import from XLSX ---
    // La importación corre entera en la base (función import_stock, ver
    // supabase_importacion_segura.sql): todo o nada, y antes de pisar nada guarda
    // cómo estaba cada producto para poder deshacerla.
    async importStock(
        rows: { codigo: string; nombre: string; familia: string; stock: number; ventaValorizada: number }[]
    ): Promise<{ updated: number; created: number }> {
        const payload = rows.map(row => {
            const subcategory = (row.familia || 'GENERAL').trim();
            return {
                codigo: (row.codigo || '').trim(),
                name: (row.nombre || '').trim(),
                // El Excel trae floats como 0.15000000000000002.
                price: Number(row.ventaValorizada.toFixed(2)),
                category: findParentCategory(subcategory),
                subcategory,
                stock: Number(row.stock.toFixed(3)),
            };
        });

        const { data, error } = await supabase.rpc('import_stock', { p_rows: payload });
        if (error) throw error;
        return { updated: data.updated, created: data.created };
    },

    async getLastImport(): Promise<ImportRecord | null> {
        const { data, error } = await supabase
            .from('import_backups')
            .select('id, created_at, updated_count, created_count, undone_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;
        return {
            id: data.id,
            createdAt: data.created_at,
            updated: data.updated_count,
            created: data.created_count,
            undoneAt: data.undone_at,
        };
    },

    async undoLastImport(): Promise<{ restored: number; deleted: number; hidden: number }> {
        const { data, error } = await supabase.rpc('undo_last_import');
        if (error) throw error;
        return data;
    },

    // --- Product Suggestions ---
    // Sumar una sugerencia repetida necesita un UPDATE. Para no dejar la tabla
    // escribible por cualquiera, el contador se incrementa dentro de la base.
    async submitSuggestion(text: string) {
        const cleanText = text.trim();
        if (!cleanText) return;

        const { error } = await supabase.rpc('submit_suggestion', { p_text: cleanText });
        if (error) throw error;
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
