export type Product = {
    id: string;
    codigo?: string;
    name: string;
    description: string;
    fullDescription?: string;
    price: number;
    category: string;
    subcategory?: string;
    image: string;
    unit: string;
    availableStock: number;
    reservedStock: number;
    isFractional?: boolean;
    fractionalStep?: number;
    badges?: string[];
    nutritionalInfo?: {
        calories?: string;
        protein?: string;
        carbs?: string;
        fat?: string;
    };
    isNewArrival?: boolean;
};

export type ProductSuggestion = {
    id: string;
    text: string;
    count: number;
    createdAt: string;
    status: 'pending' | 'reviewed' | 'added';
};

export type CartItem = {
    productId: string;
    quantity: number;
};

export type OrderStatus = 'Pendiente' | 'Preparación' | 'Listo' | 'Entregado';

export type Order = {
    id: string;
    customerName: string;
    customerPhone: string;
    items: (CartItem & { name: string; price: number })[];
    total: number;
    status: OrderStatus;
    createdAt: string;
    deliveryMethod: 'Retiro' | 'Envío';
    deliveryZone?: string;
    deliveryFee?: number;
    address?: string;
};

export type HeroPromo = {
    tag: string;
    title: string;
    description: string;
    image: string;
    buttonText: string;
};

export type FeaturedPromo = {
    sectionTitle: string;
    itemTitle: string;
    itemDescription: string;
    itemImage: string;
    price: number;
    oldPrice: number;
};
