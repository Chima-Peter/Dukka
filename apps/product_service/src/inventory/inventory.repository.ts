import { BadRequestException, Injectable } from '@nestjs/common';
import {
    Prisma,
    WarehouseStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type CreateInventoryRecord = {
    market_variant_id: string;
    warehouse_id: string;
    available_quantity: number;
};

export type ReserveInventoryItem = {
    market_variant_id: string;
    quantity: number;
};

export type StockUpdateType = 'increment' | 'decrement';

const inventoryRowSelect = {
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
            market_id: true,
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

type InventoryRow = Prisma.InventoryGetPayload<{
    select: typeof inventoryRowSelect;
}>;

export type InventoryItem = {
    id: string;
    available_quantity: number;
    reserved_quantity: number;
    market_variant_id: string;
    warehouse_id: string;
    warehouse_name: string;
    market_id: string;
    variant_id: string;
    variant_code: string;
    product_id: string;
    price: InventoryRow['market_variant']['price'];
    currency: string;
    sold_out: boolean;
    created_at: Date;
    updated_at: Date;
};

function toInventoryItem(row: InventoryRow): InventoryItem {
    return {
        id: row.id,
        available_quantity: row.available_quantity,
        reserved_quantity: row.reserved_quantity,
        market_variant_id: row.market_variant_id,
        warehouse_id: row.warehouse_id,
        warehouse_name: row.warehouse.name,
        market_id: row.warehouse.market_id,
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

@Injectable()
export class InventoryRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateInventoryRecord): Promise<InventoryItem> {
        const row = await this.prisma.inventory.create({
            data: {
                market_variant: {
                    connect: { id: data.market_variant_id },
                },
                warehouse: {
                    connect: { id: data.warehouse_id },
                },
                available_quantity: data.available_quantity,
                reserved_quantity: 0,
            },
            select: inventoryRowSelect,
        });
        return toInventoryItem(row);
    }

    async updateStock(
        marketId: string,
        marketVariantId: string,
        warehouseId: string,
        type: StockUpdateType,
        quantity: number,
    ): Promise<{ available_quantity: number; sold_out: boolean }> {
        const scope = {
            warehouse: { id: warehouseId, market_id: marketId },
            market_variant: { id: marketVariantId, market_id: marketId },
        };

        return await this.prisma.$transaction(async (tx) => {
            const updated = await tx.inventory.updateMany({
                where: {
                    ...scope,
                    ...(type === 'decrement' && {
                        available_quantity: { gte: quantity },
                    }),
                },
                data: {
                    available_quantity:
                        type === 'decrement'
                            ? { decrement: quantity }
                            : { increment: quantity },
                },
            });

            if (updated.count === 0) {
                const existing = await tx.inventory.findFirst({
                    where: scope,
                    select: { id: true },
                });
                throw new BadRequestException(
                    existing
                        ? 'Insufficient available quantity'
                        : `No inventory for market variant ${marketVariantId} in warehouse ${warehouseId}`,
                );
            }

            const row = await tx.inventory.findFirstOrThrow({
                where: scope,
                select: { available_quantity: true },
            });

            const soldOut = row.available_quantity === 0;
            await tx.marketVariant.update({
                where: { id: marketVariantId },
                data: { sold_out: soldOut },
            });

            return {
                available_quantity: row.available_quantity,
                sold_out: soldOut,
            };
        });
    }

    async findProductAvailability(productId: string, marketId: string) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            select: {
                id: true,
                variants: {
                    select: {
                        id: true,
                        market_variants: {
                            where: { market_id: marketId },
                            select: {
                                id: true,
                                sold_out: true,
                                inventories: {
                                    where: {
                                        warehouse: {
                                            market_id: marketId,
                                            status: WarehouseStatus.OPEN,
                                        },
                                    },
                                    select: {
                                        warehouse_id: true,
                                        available_quantity: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!product) {
            return null;
        }

        const items = product.variants.flatMap((variant) =>
            variant.market_variants.flatMap((marketVariant) =>
                marketVariant.inventories.map((inventory) => ({
                    variant_id: variant.id,
                    market_variant_id: marketVariant.id,
                    warehouse_id: inventory.warehouse_id,
                    available_quantity: inventory.available_quantity,
                    sold_out: marketVariant.sold_out,
                })),
            ),
        );

        return {
            product_id: product.id,
            market_id: marketId,
            items,
        };
    }

    async findByVariantId(
        variantId: string,
        marketId: string,
    ): Promise<InventoryItem[]> {
        const rows = await this.prisma.inventory.findMany({
            where: {
                market_variant: {
                    variant_id: variantId,
                    market_id: marketId,
                },
                warehouse: {
                    market_id: marketId,
                },
            },
            select: inventoryRowSelect,
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        });
        return rows.map(toInventoryItem);
    }

    async findByProductId(
        productId: string,
        marketId: string,
    ): Promise<InventoryItem[]> {
        const rows = await this.prisma.inventory.findMany({
            where: {
                market_variant: {
                    market_id: marketId,
                    variant: { product_id: productId },
                },
                warehouse: {
                    market_id: marketId,
                },
            },
            select: inventoryRowSelect,
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        });
        return rows.map(toInventoryItem);
    }

    async reserveItems(
        marketId: string,
        warehouseId: string,
        items: ReserveInventoryItem[],
    ): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            for (const item of items) {
                const updated = await tx.inventory.updateMany({
                    where: {
                        warehouse: { id: warehouseId, market_id: marketId },
                        market_variant: {
                            id: item.market_variant_id,
                            market_id: marketId,
                        },
                        available_quantity: { gte: item.quantity },
                    },
                    data: {
                        available_quantity: { decrement: item.quantity },
                        reserved_quantity: { increment: item.quantity },
                    },
                });

                if (updated.count === 0) {
                    const existing = await tx.inventory.findFirst({
                        where: {
                            warehouse: { id: warehouseId, market_id: marketId },
                            market_variant: {
                                id: item.market_variant_id,
                                market_id: marketId,
                            },
                        },
                        select: { id: true },
                    });
                    throw new BadRequestException(
                        existing
                            ? `Insufficient available quantity for market variant ${item.market_variant_id}`
                            : `No inventory for market variant ${item.market_variant_id} in warehouse ${warehouseId}`,
                    );
                }
            }
        });
    }
}
