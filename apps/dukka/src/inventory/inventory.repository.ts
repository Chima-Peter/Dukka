import { BadRequestException, Injectable } from '@nestjs/common';
import {
    Prisma,
    WarehouseStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { FindInventoryDto } from './dto/find-inventory.dto.js';
import {
    inventoryRowSelect,
    toInventoryItem,
} from './mappers/inventory.mapper.js';
import type {
    CreateInventoryRecord,
    InventoryItem,
    ReserveInventoryItem,
    ReserveInventoryResultItem,
    StockUpdateType,
} from './types/inventory.type.js';

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

    async findByVariantId(variantId: string, query: FindInventoryDto) {
        return this.findPage(
            {
                market_variant: {
                    variant_id: variantId,
                    market_id: query.market_id,
                },
                warehouse: {
                    market_id: query.market_id,
                },
            },
            query,
        );
    }

    async findByProductId(productId: string, query: FindInventoryDto) {
        return this.findPage(
            {
                market_variant: {
                    market_id: query.market_id,
                    variant: { product_id: productId },
                },
                warehouse: {
                    market_id: query.market_id,
                },
            },
            query,
        );
    }

    async findByWarehouseId(warehouseId: string, query: FindInventoryDto) {
        return this.findPage(
            {
                warehouse: {
                    id: warehouseId,
                    market_id: query.market_id,
                },
                market_variant: {
                    market_id: query.market_id,
                },
            },
            query,
        );
    }

    async findByMarketVariantId(
        marketVariantId: string,
        query: FindInventoryDto,
    ) {
        return this.findPage(
            {
                market_variant: {
                    id: marketVariantId,
                    market_id: query.market_id,
                },
                warehouse: {
                    market_id: query.market_id,
                },
            },
            query,
        );
    }

    private async findPage(
        where: Prisma.InventoryWhereInput,
        query: FindInventoryDto,
    ) {
        const limit = query.limit ?? 50;
        const records = await this.prisma.inventory.findMany({
            where,
            select: inventoryRowSelect,
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
        });

        const hasMore = records.length > limit;
        const items = (hasMore ? records.slice(0, limit) : records).map(
            toInventoryItem,
        );

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1].id : null,
        };
    }

    async reserveItems(
        marketId: string,
        items: ReserveInventoryItem[],
    ): Promise<ReserveInventoryResultItem[]> {
        return await this.prisma.$transaction(async (tx) => {
            return Promise.all(
                items.map(async (item) => {
                    const inventories = await tx.inventory.findMany({
                        where: {
                            market_variant: {
                                id: item.market_variant_id,
                                market_id: marketId,
                            },
                            warehouse: {
                                market_id: marketId,
                                status: WarehouseStatus.OPEN,
                            },
                            available_quantity: { gt: 0 },
                        },
                        select: {
                            id: true,
                            warehouse_id: true,
                            available_quantity: true,
                        },
                        take: 10,
                        orderBy: { available_quantity: 'desc' },
                    });

                    const totalAvailable = inventories.reduce(
                        (sum, inv) => sum + inv.available_quantity,
                        0,
                    );
                    if (totalAvailable < item.quantity) {
                        throw new BadRequestException(
                            inventories.length === 0
                                ? `No inventory for market variant ${item.market_variant_id}`
                                : `Insufficient available quantity for market variant ${item.market_variant_id}`,
                        );
                    }

                    let remaining = item.quantity;
                    const warehouses: ReserveInventoryResultItem['warehouses'] =
                        [];

                    for (const inv of inventories) {
                        if (remaining <= 0) {
                            break;
                        }

                        const take = Math.min(
                            inv.available_quantity,
                            remaining,
                        );
                        const updated = await tx.inventory.updateMany({
                            where: {
                                id: inv.id,
                                available_quantity: { gte: take },
                            },
                            data: {
                                available_quantity: { decrement: take },
                                reserved_quantity: { increment: take },
                            },
                        });

                        if (updated.count === 0) {
                            throw new BadRequestException(
                                `Insufficient available quantity for market variant ${item.market_variant_id}`,
                            );
                        }

                        warehouses.push({
                            warehouse_id: inv.warehouse_id,
                            quantity: take,
                        });
                        remaining -= take;
                    }

                    if (remaining > 0) {
                        throw new BadRequestException(
                            `Insufficient available quantity for market variant ${item.market_variant_id}`,
                        );
                    }

                    return {
                        market_variant_id: item.market_variant_id,
                        warehouses,
                    };
                }),
            );
        });
    }
}
