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

    private async resolvePromotionMarketId(
        tx: Prisma.TransactionClient,
        marketVariantId: string,
        promotionMarketId: string | undefined,
    ): Promise<{
        promotionMarketId: string | null | undefined;
        promotionApplied: boolean | null;
    }> {
        if (promotionMarketId === undefined) {
            return { promotionMarketId: undefined, promotionApplied: null };
        }

        const valid = await this.isValidPromotionForVariant(
            tx,
            marketVariantId,
            promotionMarketId,
        );

        if (valid) {
            return {
                promotionMarketId,
                promotionApplied: true,
            };
        }

        return {
            promotionMarketId: null,
            promotionApplied: false,
        };
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
        promotionMarketId?: string,
    ): Promise<{ cart: CartView; promotionApplied: boolean | null }> {
        return await this.prisma.$transaction(async (tx) => {
            await this.assertActiveMarketVariant(tx, marketVariantId);
            const resolved = await this.resolvePromotionMarketId(
                tx,
                marketVariantId,
                promotionMarketId,
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
                                ...(resolved.promotionMarketId !==
                                    undefined && {
                                    promotion_market_id:
                                        resolved.promotionMarketId,
                                }),
                            },
                            update: {
                                quantity: { increment: quantity },
                                ...(resolved.promotionMarketId !==
                                    undefined && {
                                    promotion_market_id:
                                        resolved.promotionMarketId,
                                }),
                            },
                        },
                    },
                },
                select: cartSelect,
            });

            return {
                cart: toCartView(cart),
                promotionApplied: resolved.promotionApplied,
            };
        });
    }

    async addItemForGuest(
        marketVariantId: string,
        quantity: number,
        cartId?: string,
        promotionMarketId?: string,
    ): Promise<{ cart: CartView; promotionApplied: boolean | null }> {
        return await this.prisma.$transaction(async (tx) => {
            await this.assertActiveMarketVariant(tx, marketVariantId);
            const resolved = await this.resolvePromotionMarketId(
                tx,
                marketVariantId,
                promotionMarketId,
            );

            const itemCreate = {
                market_variant_id: marketVariantId,
                quantity,
                ...(resolved.promotionMarketId !== undefined && {
                    promotion_market_id: resolved.promotionMarketId,
                }),
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
                return {
                    cart: toCartView(cart),
                    promotionApplied: resolved.promotionApplied,
                };
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
                                ...(resolved.promotionMarketId !==
                                    undefined && {
                                    promotion_market_id:
                                        resolved.promotionMarketId,
                                }),
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

            return {
                cart: toCartView(cart),
                promotionApplied: resolved.promotionApplied,
            };
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
