import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import {
    MarketVariantStatus,
    Prisma,
    WarehouseStatus,
    PrismaService,
} from '@app/common';
import type { FindInventoryDto } from './dto/find-inventory.dto.js';
import {
    inventoryRowSelect,
    toInventoryItem,
} from './mappers/inventory.mapper.js';
import type {
    CreateInventoryRecord,
    InventoryItem,
    ReserveInventoryItem,
    ReserveInventoryResult,
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
    ): Promise<{ available_quantity: number }> {
        const scope = {
            warehouse: {
                id: warehouseId,
                country: { market_id: marketId },
            },
            market_variant: {
                id: marketVariantId,
                market_id: marketId,
                status: MarketVariantStatus.ACTIVE,
            },
        };

        return await this.prisma.$transaction(async (tx) => {
            const updated = await tx.inventory.updateManyAndReturn({
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
                    ...(type === 'increment' && {
                        low_stock_reminder_sent: false,
                        low_stock_reminder_sent_at: null,
                        finished_reminder_sent: false,
                        finished_reminder_sent_at: null,
                    }),
                },
                select: { available_quantity: true },
            });

            if (updated.length === 0) {
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

            return {
                available_quantity: updated[0].available_quantity,
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
                            where: {
                                status: MarketVariantStatus.ACTIVE,
                                market: { id: marketId, status: 'OPEN' },
                            },
                            select: {
                                id: true,
                                sold_out: true,
                                inventories: {
                                    where: {
                                        warehouse: {
                                            country: {
                                                market: {
                                                    id: marketId,
                                                    status: 'OPEN',
                                                },
                                            },
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
        query: FindInventoryDto & { market_id: string },
    ) {
        return this.findPage(
            {
                market_variant: {
                    variant_id: variantId,
                    status: MarketVariantStatus.ACTIVE,
                    market: {
                        id: query.market_id,
                        status: 'OPEN',
                    },
                },
                warehouse: {
                    country: {
                        market: {
                            id: query.market_id,
                            status: 'OPEN',
                        },
                    },
                },
            },
            query,
        );
    }

    async findByProductId(
        productId: string,
        query: FindInventoryDto & { market_id: string },
    ) {
        return this.findPage(
            {
                market_variant: {
                    status: MarketVariantStatus.ACTIVE,
                    market: {
                        id: query.market_id,
                        status: 'OPEN',
                    },
                    variant: { product_id: productId },
                },
                warehouse: {
                    country: {
                        market: {
                            id: query.market_id,
                            status: 'OPEN',
                        },
                    },
                },
            },
            query,
        );
    }

    async findByWarehouseId(
        warehouseId: string,
        query: FindInventoryDto & { market_id: string },
    ) {
        return this.findPage(
            {
                warehouse: {
                    id: warehouseId,
                    country: { market_id: query.market_id },
                },
                market_variant: {
                    market_id: query.market_id,
                    status: MarketVariantStatus.ACTIVE,
                },
            },
            query,
        );
    }

    async findByMarketVariantId(
        marketVariantId: string,
        query: FindInventoryDto & { market_id: string },
    ) {
        return this.findPage(
            {
                market_variant: {
                    id: marketVariantId,
                    market_id: query.market_id,
                    status: MarketVariantStatus.ACTIVE,
                },
                warehouse: {
                    country: { market_id: query.market_id },
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
        orderId: string,
        marketId: string,
        warehouseId: string,
        items: ReserveInventoryItem[],
        expiresAt: Date,
        tx?: Prisma.TransactionClient,
    ): Promise<ReserveInventoryResult> {
        if (tx) {
            return await this.reserveItemsWithClient(
                tx,
                orderId,
                marketId,
                warehouseId,
                items,
                expiresAt,
            );
        }

        return await this.prisma.$transaction(async (innerTx) => {
            return await this.reserveItemsWithClient(
                innerTx,
                orderId,
                marketId,
                warehouseId,
                items,
                expiresAt,
            );
        });
    }

    private async reserveItemsWithClient(
        tx: Prisma.TransactionClient,
        orderId: string,
        marketId: string,
        warehouseId: string,
        items: ReserveInventoryItem[],
        expiresAt: Date,
    ): Promise<ReserveInventoryResult> {
        const orderInventory = await tx.orderInventory.create({
            data: {
                order: {
                    connect: { id: orderId },
                },
                warehouse: { connect: { id: warehouseId } },
                expires_at: expiresAt,
            },
        });

        if (items.length > 0) {
            const values = Prisma.join(
                items.map(
                    (item) =>
                        Prisma.sql`(${item.market_variant_id}, ${item.quantity})`,
                ),
            );

            const updated = await tx.$queryRaw<{ market_variant_id: string }[]>`
                UPDATE "Inventory" AS i
                SET
                    available_quantity = i.available_quantity - v.quantity,
                    reserved_quantity = i.reserved_quantity + v.quantity,
                    updated_at = NOW()
                FROM (VALUES ${values}) AS v(market_variant_id, quantity)
                INNER JOIN "MarketVariant" AS mv
                    ON mv.id = v.market_variant_id
                    AND mv.market_id = ${marketId}
                    AND mv.status = ${MarketVariantStatus.ACTIVE}::"MarketVariantStatus"
                WHERE i.warehouse_id = ${warehouseId}
                    AND i.market_variant_id = v.market_variant_id
                    AND i.available_quantity >= v.quantity
                RETURNING i.market_variant_id
            `;

            if (updated.length !== items.length) {
                const updatedIds = new Set(
                    updated.map((row) => row.market_variant_id),
                );
                const failed = items.find(
                    (item) => !updatedIds.has(item.market_variant_id),
                )!;
                throw new InternalServerErrorException(
                    `Insufficient available quantity for market variant ${failed.market_variant_id}. Try again later`,
                );
            }

            await tx.inventoryLineItem.createMany({
                data: items.map((item) => ({
                    order_inventory_id: orderInventory.id,
                    market_variant_id: item.market_variant_id,
                    quantity: item.quantity,
                })),
            });
        }

        return {
            order_id: orderId,
            order_inventory_id: orderInventory.id,
            warehouse_id: warehouseId,
            expires_at: expiresAt,
            items,
        };
    }

}
