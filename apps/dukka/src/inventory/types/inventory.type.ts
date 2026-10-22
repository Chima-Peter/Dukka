import type { Prisma } from '../../../generated/prisma/client.js';

export type CreateInventoryRecord = {
    market_variant_id: string;
    warehouse_id: string;
    available_quantity: number;
};

export type ReserveInventoryItem = {
    market_variant_id: string;
    quantity: number;
};

export type ReserveInventoryResult = {
    order_id: string;
    order_inventory_id: string;
    warehouse_id: string;
    expires_at: Date;
    items: ReserveInventoryItem[];
};

export type StockUpdateType = 'increment' | 'decrement';

export type InventoryItem = {
    id: string;
    available_quantity: number;
    market_variant_id: string;
    warehouse_id: string;
    warehouse_name: string;
    market_id: string;
    variant_id: string;
    variant_code: string;
    product_id: string;
    price: Prisma.Decimal;
    currency: string;
    sold_out: boolean;
    created_at: Date;
    updated_at: Date;
};
