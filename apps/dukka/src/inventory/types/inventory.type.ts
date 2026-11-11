import type {
    MarketVariantStatus,
    Prisma,
    WarehouseStatus,
} from '@app/common';

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

export type InventoryDetail = {
    id: string;
    available_quantity: number;
    reserved_quantity: number;
    low_stock_reminder_sent: boolean;
    low_stock_reminder_sent_at: Date | null;
    finished_reminder_sent: boolean;
    finished_reminder_sent_at: Date | null;
    created_at: Date;
    updated_at: Date;
    market_variant_id: string;
    warehouse_id: string;
    warehouse: {
        id: string;
        name: string;
        status: WarehouseStatus;
        market_id: string;
    };
    market: {
        id: string;
        name: string;
        code: string;
    };
    market_variant: {
        id: string;
        price: Prisma.Decimal;
        currency: string;
        sold_out: boolean;
        status: MarketVariantStatus;
        market_id: string;
    };
    product: {
        id: string;
        name: string;
    };
    variant: {
        id: string;
        variant_code: string;
        color: string | null;
        size: string | null;
        image_url: string | null;
    };
};
