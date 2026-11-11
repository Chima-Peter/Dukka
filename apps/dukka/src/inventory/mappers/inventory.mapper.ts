import type { Prisma } from '@app/common';
import type { InventoryItem } from '../types/inventory.type.js';

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

type InventoryRow = Prisma.InventoryGetPayload<{
    select: typeof inventoryRowSelect;
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
