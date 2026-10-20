import { BadRequestException, Injectable } from '@nestjs/common';
import {
    Prisma,
    WarehouseStatus,
    type Inventory,
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

const inventoryDetailSelect = {
    id: true,
    available_quantity: true,
    reserved_quantity: true,
    market_variant_id: true,
    warehouse_id: true,
    created_at: true,
    updated_at: true,
    warehouse: {
        select: {
            id: true,
            market_id: true,
            name: true,
            status: true,
        },
    },
    market_variant: {
        select: {
            id: true,
            market_id: true,
            price: true,
            currency: true,
            variant_id: true,
            variant: {
                select: {
                    id: true,
                    variant_code: true,
                    color: true,
                    size: true,
                    product_id: true,
                },
            },
        },
    },
} satisfies Prisma.InventorySelect;

export type InventoryDetail = Prisma.InventoryGetPayload<{
    select: typeof inventoryDetailSelect;
}>;

@Injectable()
export class InventoryRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateInventoryRecord): Promise<InventoryDetail> {
        return await this.prisma.inventory.create({
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
            select: inventoryDetailSelect,
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

        const variants = product.variants.map(
            ({ market_variants, ...variant }) => {
                const mappedMarketVariants = market_variants.map(
                    ({ inventories, ...marketVariant }) => {
                        const available_quantity = inventories.reduce(
                            (sum, row) => sum + row.available_quantity,
                            0,
                        );
                        return {
                            ...marketVariant,
                            available_quantity,
                            inventories: inventories.map((inventory) => ({
                                warehouse_id: inventory.warehouse_id,
                                available_quantity:
                                    inventory.available_quantity,
                            })),
                        };
                    },
                );

                return {
                    ...variant,
                    available_quantity: mappedMarketVariants.reduce(
                        (sum, marketVariant) =>
                            sum + marketVariant.available_quantity,
                        0,
                    ),
                    market_variants: mappedMarketVariants,
                };
            },
        );

        return {
            product_id: product.id,
            market_id: marketId,
            available_quantity: variants.reduce(
                (sum, variant) => sum + variant.available_quantity,
                0,
            ),
            variants,
        };
    }

    async findByVariantId(
        variantId: string,
        marketId: string,
    ): Promise<InventoryDetail[]> {
        return await this.prisma.inventory.findMany({
            where: {
                market_variant: {
                    variant_id: variantId,
                    market_id: marketId,
                },
                warehouse: {
                    market_id: marketId,
                },
            },
            select: inventoryDetailSelect,
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        });
    }

    async findByProductId(
        productId: string,
        marketId: string,
    ): Promise<InventoryDetail[]> {
        return await this.prisma.inventory.findMany({
            where: {
                market_variant: {
                    market_id: marketId,
                    variant: { product_id: productId },
                },
                warehouse: {
                    market_id: marketId,
                },
            },
            select: inventoryDetailSelect,
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        });
    }

    async reserveItems(
        warehouseId: string,
        items: ReserveInventoryItem[],
    ): Promise<Inventory[]> {
        return await this.prisma.$transaction(async (tx) => {
            return await Promise.all(
                items.map(async (item) => {
                    const updated = await tx.inventory.updateMany({
                        where: {
                            warehouse_id: warehouseId,
                            market_variant_id: item.market_variant_id,
                            available_quantity: { gte: item.quantity },
                        },
                        data: {
                            available_quantity: { decrement: item.quantity },
                            reserved_quantity: { increment: item.quantity },
                        },
                    });

                    if (updated.count === 0) {
                        const existing = await tx.inventory.findUnique({
                            where: {
                                market_variant_id_warehouse_id: {
                                    market_variant_id: item.market_variant_id,
                                    warehouse_id: warehouseId,
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

                    return await tx.inventory.findUniqueOrThrow({
                        where: {
                            market_variant_id_warehouse_id: {
                                market_variant_id: item.market_variant_id,
                                warehouse_id: warehouseId,
                            },
                        },
                    });
                }),
            );
        });
    }
}
