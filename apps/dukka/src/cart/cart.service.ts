import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { Prisma } from '@app/common';
import { computeDiscountAmount } from '../promotions/utils/compute-discount-amount.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import { CartRepository } from './cart.repository.js';
import type { AddCartItemDto } from './dto/add-cart-item.dto.js';
import type { AddGuestCartItemDto } from './dto/add-guest-cart-item.dto.js';
import type { DeleteCartItemsDto } from './dto/delete-cart-items.dto.js';
import type { DeleteGuestCartItemsDto } from './dto/delete-guest-cart-items.dto.js';
import type { UpdateCartItemQuantityDto } from './dto/update-cart-item-quantity.dto.js';
import type { UpdateGuestCartItemQuantityDto } from './dto/update-guest-cart-item-quantity.dto.js';
import type {
    CartAddView,
    CartItemView,
    CartTotalView,
    CartView,
} from './types/cart.type.js';

@Injectable()
export class CartService {
    private readonly logger = new Logger(CartService.name);

    constructor(private readonly cartRepository: CartRepository) {}

    async getForCustomer(cartId: string): Promise<CartView> {
        try {
            this.logger.log(`Fetching cart ${cartId}`);
            const cart = await this.cartRepository.findByCartId(cartId);
            this.logger.log(`Fetched cart ${cartId}`);
            return cart;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getForGuest(cartId: string): Promise<CartView> {
        try {
            this.logger.log(`Fetching guest cart ${cartId}`);
            const cart = await this.cartRepository.findByCartId(cartId);

            if (cart.customer_id !== null) {
                throw new BadRequestException(
                    'Cannot access a customer cart as a guest',
                );
            }

            this.logger.log(`Fetched guest cart ${cartId}`);
            return cart;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getTotalForCustomer(cartId: string): Promise<CartTotalView> {
        try {
            this.logger.log(`Calculating total for cart ${cartId}`);
            const cart = await this.cartRepository.findByCartId(cartId);
            const total = await this.syncTotal(cart);
            this.logger.log(`Calculated total for cart ${cartId}`);
            return total;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getTotalForGuest(cartId: string): Promise<CartTotalView> {
        try {
            this.logger.log(`Calculating total for guest cart ${cartId}`);
            const cart = await this.cartRepository.findByCartId(cartId);
            const total = await this.syncTotal(cart);
            this.logger.log(`Calculated total for guest cart ${cartId}`);
            return total;
        } catch (error) {
            this.handleError(error);
        }
    }

    async addItemForCustomer(
        cartId: string,
        data: AddCartItemDto,
    ): Promise<CartAddView> {
        try {
            this.logger.log(
                `Adding item ${data.market_variant_id} x${data.quantity} to cart ${cartId}`,
            );
            const { cart, promotionApplied } =
                await this.cartRepository.addItemForCustomer(
                    cartId,
                    data.market_variant_id,
                    data.quantity,
                    data.promotion_market_id,
                );
            const updated = await this.applyTotal(cart);
            this.logger.log(`Cart ${updated.id} updated`);
            return this.withPromotionWarning(updated, promotionApplied);
        } catch (error) {
            this.handleError(error);
        }
    }

    async addItemForGuest(data: AddGuestCartItemDto): Promise<CartAddView> {
        try {
            this.logger.log(
                `Adding item ${data.market_variant_id} x${data.quantity} for guest cart ${data.cart_id ?? 'new'}`,
            );
            const { cart, promotionApplied } =
                await this.cartRepository.addItemForGuest(
                    data.market_variant_id,
                    data.quantity,
                    data.cart_id,
                    data.promotion_market_id,
                );
            const updated = await this.applyTotal(cart);
            this.logger.log(`Guest cart ${updated.id} updated`);
            return this.withPromotionWarning(updated, promotionApplied);
        } catch (error) {
            this.handleError(error);
        }
    }

    async updateItemQuantityForCustomer(
        cartId: string,
        itemId: string,
        data: UpdateCartItemQuantityDto,
    ): Promise<CartView> {
        try {
            this.logger.log(
                `Updating cart item ${itemId} quantity to ${data.quantity} in cart ${cartId}`,
            );
            const cart = await this.cartRepository.updateItemQuantity(
                cartId,
                itemId,
                data.quantity,
            );
            const updated = await this.applyTotal(cart);
            this.logger.log(`Cart ${updated.id} quantity updated`);
            return updated;
        } catch (error) {
            this.handleError(error);
        }
    }

    async updateItemQuantityForGuest(
        itemId: string,
        data: UpdateGuestCartItemQuantityDto,
    ): Promise<CartView> {
        try {
            this.logger.log(
                `Updating cart item ${itemId} quantity to ${data.quantity} in guest cart ${data.cart_id}`,
            );
            const cart = await this.cartRepository.updateItemQuantity(
                data.cart_id,
                itemId,
                data.quantity,
            );
            const updated = await this.applyTotal(cart);
            this.logger.log(`Cart ${updated.id} quantity updated`);
            return updated;
        } catch (error) {
            this.handleError(error);
        }
    }

    async deleteItemsForCustomer(
        cartId: string,
        data: DeleteCartItemsDto,
    ): Promise<object> {
        try {
            this.logger.log(
                `Deleting ${data.item_ids.length} item(s) from cart ${cartId}`,
            );
            await this.cartRepository.deleteItems(cartId, data.item_ids);
            this.logger.log(`Cart items deleted from cart ${cartId}`);
            return { data: null };
        } catch (error) {
            this.handleError(error);
        }
    }

    async deleteItemsForGuest(
        data: DeleteGuestCartItemsDto,
    ): Promise<object> {
        try {
            this.logger.log(
                `Deleting ${data.item_ids.length} item(s) from guest cart ${data.cart_id}`,
            );
            await this.cartRepository.deleteItems(
                data.cart_id,
                data.item_ids,
            );
            this.logger.log(
                `Cart items deleted from guest cart ${data.cart_id}`,
            );
            return { data: null };
        } catch (error) {
            this.handleError(error);
        }
    }

    async clearCart(cartId: string): Promise<void> {
        try {
            this.logger.log(`Clearing cart ${cartId}`);
            await this.cartRepository.clearCart(cartId);
            this.logger.log(`Cart ${cartId} cleared`);
        } catch (error) {
            this.handleError(error);
        }
    }

    private withPromotionWarning(
        cart: CartView,
        promotionApplied: boolean | null,
    ): CartAddView {
        return {
            ...cart,
            promotion_warning:
                promotionApplied === false
                    ? 'Promotion is not active and was not applied'
                    : null,
        };
    }

    private async applyTotal(cart: CartView): Promise<CartView> {
        const total = this.calculateTotal(cart.items);
        return { ...cart, total };
    }

    private async syncTotal(cart: CartView): Promise<CartTotalView> {
        const total = this.calculateTotal(cart.items);
        await this.cartRepository.setTotal(cart.id, total);
        this.logger.log(`Cart ${cart.id} total calculated`);
        return { cart_id: cart.id, total };
    }

    private calculateTotal(
        items: Pick<CartItemView, 'quantity' | 'price' | 'discount'>[],
    ): Prisma.Decimal {
        return items.reduce((sum, item) => {
            const discountAmount =
                item.discount === null
                    ? new Prisma.Decimal(0)
                    : computeDiscountAmount(
                          item.discount.type,
                          item.discount.value,
                          item.discount.max_discount_amount,
                          item.price,
                      );
            const unitPrice = item.price.minus(discountAmount);
            return sum.plus(unitPrice.mul(item.quantity));
        }, new Prisma.Decimal(0));
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            throw error;
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                const model = prismaMissingRecordModel(error);
                if (model === 'customer') {
                    throw new NotFoundException('Customer not found');
                }
                if (model === 'marketvariant') {
                    throw new NotFoundException('Market variant not found');
                }
                if (model === 'cart' || model === 'cartitems') {
                    throw new NotFoundException('Cart item not found');
                }
                throw new NotFoundException('Record not found');
            }

            if (
                error.code === 'P2003' &&
                prismaHintIncludes(error, 'customer')
            ) {
                throw new NotFoundException('Customer not found');
            }

            if (
                error.code === 'P2003' &&
                prismaHintIncludes(error, 'market_variant', 'marketvariant')
            ) {
                throw new NotFoundException('Market variant not found');
            }

        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
