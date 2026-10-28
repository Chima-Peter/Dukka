export type OrderAddressSnapshot = {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    whatsapp_number?: string | null;
    country: string;
    state: string;
    market_id: string;
    street_address: string;
};

export type GuestAddressSnapshot = {
    name: string;
    email: string;
    phone_number: string;
    country: string;
    state: string;
    market_id: string;
    street_address: string;
};

export type CreateOrderItemInput = {
    market_variant_id: string;
    quantity: number;
    price: number;
    total: number;
    product_name: string;
    product_image: string;
    product_specs: Record<string, unknown>;
    promotion_usage_id?: string;
};

export type CreateOrderMoneyInput = {
    currency: string;
    subtotal: number;
    shipping_fee: number;
    discount_amount: number;
    points_discount: number;
    coupon_discount: number;
    total_amount: number;
    market_id: string;
    warehouse_id: string;
    items: CreateOrderItemInput[];
    coupon_usage_id?: string;
};

export type CreateOrderInput = CreateOrderMoneyInput & {
    shipping_address: OrderAddressSnapshot;
    billing_address: OrderAddressSnapshot;
};

export type CreateGuestOrderInput = CreateOrderMoneyInput & {
    guest_email: string;
    guest_name: string;
    guest_phone_number: string;
    shipping_address: Omit<GuestAddressSnapshot, 'market_id'>;
    billing_address: Omit<GuestAddressSnapshot, 'market_id'>;
};

export type CreateOrderBase = CreateOrderMoneyInput & {
    shipping_address: OrderAddressSnapshot | GuestAddressSnapshot;
    billing_address: OrderAddressSnapshot | GuestAddressSnapshot;
    customer_id?: string;
    guest_email?: string;
    guest_name?: string;
    guest_phone_number?: string;
};
