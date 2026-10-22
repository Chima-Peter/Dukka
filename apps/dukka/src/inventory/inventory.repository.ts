import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    OrderInventoryStatus,
    Prisma,
    WarehouseStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { FindInventoryDto } from './dto/find-inventory.dto.js';
import {
    inventoryRowSelect,
    orderInventoryRowSelect,
    toInventoryItem,
    toOrderInventoryItem,
} from './mappers/inventory.mapper.js';
import type {
    CreateInventoryRecord,
    InventoryItem,
    OrderInventoryItem,
    ReserveInventoryItem,
    ReserveInventoryResult,
    StockUpdateType,
} from './types/inventory.type.js';

const pendingReservationSelect = {
    id: true,
    order_id: true,
    warehouse_id: true,
    expires_at: true,
    line_items: {
        select: {
            market_variant_id: true,
            quantity: true,
        },
    },
} satisfies Prisma.OrderInventorySelect;

@Injectable()
export class InventoryRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findPendingReservation(
        orderId: string,
        customerId: string,
    ): Promise<ReserveInventoryResult | null> {
        const existing = await this.prisma.orderInventory.findFirst({
            where: {
                order_id: orderId,
                order: { customer_id: customerId },
                status: OrderInventoryStatus.PENDING,
                expires_at: { gt: new Date() },
            },
            select: pendingReservationSelect,
        });

        if (!existing) {
            return null;
        }

        return {
            order_id: existing.order_id,
            order_inventory_id: existing.id,
            warehouse_id: existing.warehouse_id,
            expires_at: existing.expires_at,
            items: existing.line_items.map((line) => ({
                market_variant_id: line.market_variant_id,
                quantity: line.quantity,
            })),
        };
    }

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
            warehouse: { id: warehouseId, market_id: marketId },
            market_variant: { id: marketVariantId, market_id: marketId },
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
        orderId: string,
        customerId: string,
        marketId: string,
        warehouseId: string,
        items: ReserveInventoryItem[],
        expiresAt: Date,
    ): Promise<ReserveInventoryResult> {
        return await this.prisma.$transaction(async (tx) => {
            const orderInventory = await tx.orderInventory.create({
                data: {
                    order: {
                        connect: { id: orderId, customer_id: customerId },
                    },
                    warehouse: { connect: { id: warehouseId } },
                    expires_at: expiresAt,
                },
            });

            for (const item of items) {
                const scope = {
                    warehouse_id: warehouseId,
                    market_variant: {
                        id: item.market_variant_id,
                        market_id: marketId,
                    },
                };

                const updated = await tx.inventory.updateManyAndReturn({
                    where: {
                        ...scope,
                        available_quantity: { gte: item.quantity },
                    },
                    data: {
                        available_quantity: { decrement: item.quantity },
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
                            ? `Insufficient available quantity for market variant ${item.market_variant_id}`
                            : `No inventory for market variant ${item.market_variant_id} in warehouse ${warehouseId}`,
                    );
                }

                await tx.inventoryLineItem.create({
                    data: {
                        order_inventory: {
                            connect: { id: orderInventory.id },
                        },
                        market_variant: {
                            connect: { id: item.market_variant_id },
                        },
                        quantity: item.quantity,
                    },
                });
            }

            return {
                order_id: orderId,
                order_inventory_id: orderInventory.id,
                warehouse_id: warehouseId,
                expires_at: expiresAt,
                items,
            };
        });
    }

    async findOrderInventoryById(
        id: string,
    ): Promise<OrderInventoryItem | null> {
        const row = await this.prisma.orderInventory.findUnique({
            where: { id },
            select: orderInventoryRowSelect,
        });
        return row ? toOrderInventoryItem(row) : null;
    }

    async updateOrderInventoryStatus(
        id: string,
        status:
            | typeof OrderInventoryStatus.SUCCESS
            | typeof OrderInventoryStatus.CLOSED,
    ): Promise<OrderInventoryItem> {
        return await this.prisma.$transaction(async (tx) => {
            const claimed = await tx.orderInventory.updateManyAndReturn({
                where: { id, status: OrderInventoryStatus.PENDING },
                data: { status },
                select: {
                    id: true,
                    order_id: true,
                    warehouse_id: true,
                    status: true,
                    expires_at: true,
                    created_at: true,
                    updated_at: true,
                    warehouse: {
                        select: {
                            market_id: true,
                        },
                    },
                },
            });

            if (claimed.length === 0) {
                throw new BadRequestException(
                    `Cannot change status of ${id}`,
                );
            }

            const row = claimed[0];

            if (status === OrderInventoryStatus.CLOSED) {
                const lineItems = await tx.inventoryLineItem.findMany({
                    where: { order_inventory_id: row.id },
                    select: {
                        market_variant_id: true,
                        quantity: true,
                    },
                });

                for (const line of lineItems) {
                    const updated = await tx.inventory.updateManyAndReturn({
                        where: {
                            warehouse_id: row.warehouse_id,
                            market_variant_id: line.market_variant_id,
                        },
                        data: {
                            available_quantity: { increment: line.quantity },
                        },
                        select: {
                            available_quantity: true,
                        },
                    });

                    if (updated.length === 0) {
                        throw new BadRequestException(
                            `No inventory for market variant ${line.market_variant_id} in warehouse ${row.warehouse_id}`,
                        );
                    }
                }
            }

            return toOrderInventoryItem(row);
        });
    }
}
