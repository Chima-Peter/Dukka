import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    MarketVariantStatus,
    Prisma,
    PrismaService,
    PromotionMarketStatus,
    PromotionStatus,
} from '@app/common';
import { cartSelect, toCartView } from './mappers/cart.mapper.js';
import type { CartView } from './types/cart.type.js';

@Injectable()
export class CartRepository {
    constructor(private readonly prisma: PrismaService) {}

    private async assertActiveMarketVariant(
        tx: Prisma.TransactionClient,
        marketVariantId: string,
    ): Promise<void> {
        const marketVariant = await tx.marketVariant.findFirst({
            where: {
                id: marketVariantId,
                status: MarketVariantStatus.ACTIVE,
            },
            select: { id: true },
        });
        if (!marketVariant) {
            throw new NotFoundException('Market variant not found');
        }
    }

    private async isValidPromotionForVariant(
        tx: Prisma.TransactionClient,
        marketVariantId: string,
        promotionMarketId: string,
    ): Promise<boolean> {
        const now = new Date();
        const link = await tx.promotionMarketVariant.findFirst({
            where: {
                variant_id: marketVariantId,
                promotion_market_id: promotionMarketId,
                promotion_market: {
                    status: PromotionMarketStatus.ACTIVE,
                    start_date: { lte: now },
                    end_date: { gte: now },
                    promotion: { status: PromotionStatus.ACTIVE },
                },
            },
            select: { id: true },
        });

        return link !== null;
    }

    private async findPromotionMarketIdForVariant(
        tx: Prisma.TransactionClient,
        marketVariantId: string,
    ): Promise<string | null> {
        const now = new Date();
        const link = await tx.promotionMarketVariant.findFirst({
            where: {
                variant_id: marketVariantId,
                promotion_market: {
                    status: PromotionMarketStatus.ACTIVE,
                    start_date: { lte: now },
                    end_date: { gte: now },
                    promotion: { status: PromotionStatus.ACTIVE },
                },
            },
            select: { promotion_market_id: true },
        });

        return link?.promotion_market_id ?? null;
    }

    async findByCartId(cartId: string): Promise<CartView> {
        const cart = await this.prisma.cart.findUnique({
            where: { id: cartId },
            select: cartSelect,
        });

        if (!cart) {
            throw new NotFoundException('Cart not found');
        }

        return toCartView(cart);
    }

    async syncPromotions(cartId: string): Promise<CartView> {
        return await this.prisma.$transaction(async (tx) => {
            const cart = await tx.cart.findUnique({
                where: { id: cartId },
                select: {
                    id: true,
                    items: {
                        select: {
                            id: true,
                            market_variant_id: true,
                            promotion_market_id: true,
                        },
                    },
                },
            });

            if (!cart) {
                throw new NotFoundException('Cart not found');
            }

            const removedItemIds = new Set<string>();

            for (const item of cart.items) {
                if (item.promotion_market_id === null) {
                    continue;
                }

                const valid = await this.isValidPromotionForVariant(
                    tx,
                    item.market_variant_id,
                    item.promotion_market_id,
                );

                if (!valid) {
                    await tx.cartItems.update({
                        where: { id: item.id },
                        data: { promotion_market_id: null },
                    });
                    removedItemIds.add(item.id);
                }
            }

            const updated = await tx.cart.findUnique({
                where: { id: cartId },
                select: cartSelect,
            });

            if (!updated) {
                throw new NotFoundException('Cart not found');
            }

            const view = toCartView(updated);

            if (removedItemIds.size === 0) {
                return view;
            }

            return {
                ...view,
                items: view.items.map((item) =>
                    removedItemIds.has(item.id)
                        ? {
                              ...item,
                              promotion_warning:
                                  'Promotion is not active and was removed',
                          }
                        : item,
                ),
            };
        });
    }

    async findByCustomerId(customerId: string): Promise<CartView> {
        const cart = await this.prisma.cart.findUnique({
            where: { customer_id: customerId },
            select: cartSelect,
        });

        if (!cart) {
            throw new NotFoundException('Cart not found');
        }

        return toCartView(cart);
    }

    async findCartIdByCustomerId(customerId: string): Promise<string> {
        const cart = await this.prisma.cart.findUnique({
            where: { customer_id: customerId },
            select: { id: true },
        });

        if (!cart) {
            throw new NotFoundException('Cart not found');
        }

        return cart.id;
    }

    async findOrCreateCartIdForCustomer(customerId: string): Promise<string> {
        const existing = await this.prisma.cart.findUnique({
            where: { customer_id: customerId },
            select: { id: true },
        });

        if (existing) {
            return existing.id;
        }

        const cart = await this.prisma.cart.create({
            data: {
                customer: { connect: { id: customerId } },
            },
            select: { id: true },
        });

        return cart.id;
    }

    async setTotal(
        cartId: string,
        total: Prisma.Decimal,
    ): Promise<CartView> {
        const cart = await this.prisma.cart.update({
            where: { id: cartId },
            data: { total },
            select: cartSelect,
        });

        return toCartView(cart);
    }

    async addItemForCustomer(
        cartId: string,
        marketVariantId: string,
        quantity: number,
    ): Promise<CartView> {
        return await this.prisma.$transaction(async (tx) => {
            await this.assertActiveMarketVariant(tx, marketVariantId);
            const promotionMarketId =
                await this.findPromotionMarketIdForVariant(
                    tx,
                    marketVariantId,
                );

            const cart = await tx.cart.update({
                where: { id: cartId },
                data: {
                    items: {
                        upsert: {
                            where: {
                                cart_id_market_variant_id: {
                                    cart_id: cartId,
                                    market_variant_id: marketVariantId,
                                },
                            },
                            create: {
                                market_variant_id: marketVariantId,
                                quantity,
                                promotion_market_id: promotionMarketId,
                            },
                            update: {
                                quantity: { increment: quantity },
                                promotion_market_id: promotionMarketId,
                            },
                        },
                    },
                },
                select: cartSelect,
            });

            return toCartView(cart);
        });
    }

    async addItemForGuest(
        marketVariantId: string,
        quantity: number,
        cartId?: string,
    ): Promise<CartView> {
        return await this.prisma.$transaction(async (tx) => {
            await this.assertActiveMarketVariant(tx, marketVariantId);
            const promotionMarketId =
                await this.findPromotionMarketIdForVariant(
                    tx,
                    marketVariantId,
                );

            const itemCreate = {
                market_variant_id: marketVariantId,
                quantity,
                promotion_market_id: promotionMarketId,
            };

            if (cartId === undefined) {
                const cart = await tx.cart.create({
                    data: {
                        items: {
                            create: itemCreate,
                        },
                    },
                    select: cartSelect,
                });
                return toCartView(cart);
            }

            const cart = await tx.cart.upsert({
                where: { id: cartId },
                create: {
                    id: cartId,
                    items: {
                        create: itemCreate,
                    },
                },
                update: {
                    items: {
                        upsert: {
                            where: {
                                cart_id_market_variant_id: {
                                    cart_id: cartId,
                                    market_variant_id: marketVariantId,
                                },
                            },
                            create: itemCreate,
                            update: {
                                quantity: { increment: quantity },
                                promotion_market_id: promotionMarketId,
                            },
                        },
                    },
                },
                select: cartSelect,
            });

            if (cart.customer_id !== null) {
                throw new BadRequestException(
                    'Cannot add items to a customer cart as a guest',
                );
            }

            return toCartView(cart);
        });
    }

    async updateItemQuantity(
        cartId: string,
        itemId: string,
        quantity: number,
    ): Promise<CartView> {
        const updated = await this.prisma.cartItems.updateManyAndReturn({
            where: { id: itemId, cart_id: cartId },
            data: { quantity },
            include: {
                cart: { select: cartSelect },
            },
        });

        if (updated.length === 0) {
            throw new NotFoundException('Cart item not found');
        }

        return toCartView(updated[0].cart);
    }

    async deleteItems(cartId: string, itemIds: string[]): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            const items = await tx.cartItems.findMany({
                where: {
                    cart_id: cartId,
                    id: { in: itemIds },
                },
                select: { cart_id: true },
            });
            if (items.length != itemIds.length) {
                throw new NotFoundException('One or more cart items not found');
            }
            await this.prisma.cartItems.deleteMany({
                where: {
                    cart_id: cartId,
                    id: { in: itemIds },
                },
            });
        });
    }

    async clearCart(cartId: string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            const cart = await tx.cart.findUnique({
                where: { id: cartId },
                select: { id: true },
            });

            if (!cart) {
                throw new NotFoundException('Cart not found');
            }

            await tx.cartItems.deleteMany({
                where: { cart_id: cartId },
            });

            await tx.cart.update({
                where: { id: cartId },
                data: { total: 0 },
            });
        });
    }
}
