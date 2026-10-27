import type { Prisma } from '@app/common';
import type {
    InventoryItem,
    OrderInventoryItem,
} from '../types/inventory.type.js';

export const inventoryRowSelect = {
    id: true,
    available_quantity: true,
    reserved_quantity: true,
    market_variant_id: true,
    warehouse_id: true,
    created_at: true,
    updated_at: true,
    warehouse: {
        select: {
            name: true,
            country: {
                select: {
                    market_id: true,
                },
            },
        },
    },
    market_variant: {
        select: {
            price: true,
            currency: true,
            sold_out: true,
            variant_id: true,
            variant: {
                select: {
                    variant_code: true,
                    product_id: true,
                },
            },
        },
    },
} satisfies Prisma.InventorySelect;

export const orderInventoryRowSelect = {
    id: true,
    order_id: true,
    warehouse_id: true,
    status: true,
    expires_at: true,
    created_at: true,
    updated_at: true,
    warehouse: {
        select: {
            country: {
                select: {
                    market_id: true,
                },
            },
        },
    },
} satisfies Prisma.OrderInventorySelect;

type InventoryRow = Prisma.InventoryGetPayload<{
    select: typeof inventoryRowSelect;
}>;

type OrderInventoryRow = Prisma.OrderInventoryGetPayload<{
    select: typeof orderInventoryRowSelect;
}>;

export function toInventoryItem(row: InventoryRow): InventoryItem {
    return {
        id: row.id,
        available_quantity: row.available_quantity,
        reserved_quantity: row.reserved_quantity,
        market_variant_id: row.market_variant_id,
        warehouse_id: row.warehouse_id,
        warehouse_name: row.warehouse.name,
        market_id: row.warehouse.country.market_id!,
        variant_id: row.market_variant.variant_id,
        variant_code: row.market_variant.variant.variant_code,
        product_id: row.market_variant.variant.product_id,
        price: row.market_variant.price,
        currency: row.market_variant.currency,
        sold_out: row.market_variant.sold_out,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toOrderInventoryItem(
    row: OrderInventoryRow,
): OrderInventoryItem {
    return {
        id: row.id,
        order_id: row.order_id,
        warehouse_id: row.warehouse_id,
        market_id: row.warehouse.country.market_id!,
        status: row.status,
        expires_at: row.expires_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
