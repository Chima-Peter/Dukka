import type { Prisma } from '@app/common';

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
    warehouse_name: string;
    product_name: string;
    variant_code: string;
    available_quantity: number;
    price: Prisma.Decimal;
    currency: string;
};
