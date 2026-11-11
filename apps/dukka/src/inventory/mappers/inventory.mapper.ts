import type { Prisma } from '@app/common';
import type { InventoryDetail, InventoryItem } from '../types/inventory.type.js';

export const inventoryRowSelect = {
    id: true,
    available_quantity: true,
    warehouse: {
        select: {
            name: true,
        },
    },
    market_variant: {
        select: {
            price: true,
            currency: true,
            variant: {
                select: {
                    variant_code: true,
                    product: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
    },
} satisfies Prisma.InventorySelect;

export const inventoryDetailSelect = {
    id: true,
    available_quantity: true,
    reserved_quantity: true,
    low_stock_reminder_sent: true,
    low_stock_reminder_sent_at: true,
    finished_reminder_sent: true,
    finished_reminder_sent_at: true,
    created_at: true,
    updated_at: true,
    market_variant_id: true,
    warehouse_id: true,
    warehouse: {
        select: {
            id: true,
            name: true,
            status: true,
            market_id: true,
            market: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
        },
    },
    market_variant: {
        select: {
            id: true,
            price: true,
            currency: true,
            sold_out: true,
            status: true,
            market_id: true,
            variant: {
                select: {
                    id: true,
                    variant_code: true,
                    color: true,
                    size: true,
                    image: {
                        select: {
                            image_url: true,
                        },
                    },
                    product: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
    },
} satisfies Prisma.InventorySelect;

type InventoryRow = Prisma.InventoryGetPayload<{
    select: typeof inventoryRowSelect;
}>;

type InventoryDetailRow = Prisma.InventoryGetPayload<{
    select: typeof inventoryDetailSelect;
}>;

export function toInventoryItem(row: InventoryRow): InventoryItem {
    return {
        id: row.id,
        warehouse_name: row.warehouse.name,
        product_name: row.market_variant.variant.product.name,
        variant_code: row.market_variant.variant.variant_code,
        available_quantity: row.available_quantity,
        price: row.market_variant.price,
        currency: row.market_variant.currency,
    };
}

export function toInventoryDetail(row: InventoryDetailRow): InventoryDetail {
    const variant = row.market_variant.variant;
    return {
        id: row.id,
        available_quantity: row.available_quantity,
        reserved_quantity: row.reserved_quantity,
        low_stock_reminder_sent: row.low_stock_reminder_sent,
        low_stock_reminder_sent_at: row.low_stock_reminder_sent_at,
        finished_reminder_sent: row.finished_reminder_sent,
        finished_reminder_sent_at: row.finished_reminder_sent_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        market_variant_id: row.market_variant_id,
        warehouse_id: row.warehouse_id,
        warehouse: {
            id: row.warehouse.id,
            name: row.warehouse.name,
            status: row.warehouse.status,
            market_id: row.warehouse.market_id,
        },
        market: row.warehouse.market,
        market_variant: {
            id: row.market_variant.id,
            price: row.market_variant.price,
            currency: row.market_variant.currency,
            sold_out: row.market_variant.sold_out,
            status: row.market_variant.status,
            market_id: row.market_variant.market_id,
        },
        product: {
            id: variant.product.id,
            name: variant.product.name,
        },
        variant: {
            id: variant.id,
            variant_code: variant.variant_code,
            color: variant.color,
            size: variant.size,
            image_url: variant.image?.image_url ?? null,
        },
    };
}
