import { randomUUID } from 'node:crypto';
import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProductVariantService } from '../product/product-variant.service.js';
import { cartSelect, toCartView } from './mappers/cart.mapper.js';
import type { CartView } from './types/cart.type.js';

@Injectable()
export class CartRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly productVariantService: ProductVariantService,
    ) {}

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
    ): Promise<CartView> {
        return await this.prisma.$transaction(async (tx) => {
            await this.productVariantService.assertMarketVariantAvailable(
                marketVariantId,
                tx,
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
                            },
                            update: {
                                quantity: { increment: quantity },
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
            await this.productVariantService.assertMarketVariantAvailable(
                marketVariantId,
                tx,
            );

            if (cartId === undefined) {
                const cart = await tx.cart.create({
                    data: {
                        items: {
                            create: {
                                market_variant_id: marketVariantId,
                                quantity,
                            },
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
                        create: {
                            market_variant_id: marketVariantId,
                            quantity,
                        },
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
                            create: {
                                market_variant_id: marketVariantId,
                                quantity,
                            },
                            update: {
                                quantity: { increment: quantity },
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
                    id: { in: itemIds, },
                },
                select: { cart_id: true }
            })
            if (items.length != itemIds.length) {
                throw new NotFoundException('One or more cart items not found');
            }
            const result = await this.prisma.cartItems.deleteMany({
                where: {
                    cart_id: cartId,
                    id: { in: itemIds },
                },
            });
        })
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
