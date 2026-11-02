import { BadRequestException, Injectable } from '@nestjs/common';
import {
    OrderStatus,
    POINT_REASON,
    PrismaService,
} from '@app/common';
import { CartService } from '../cart/cart.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { PointsService } from '../points/points.service.js';
import type {
    PlaceCheckoutInput,
    PlaceCheckoutResult,
} from './types/place-checkout.type.js';

@Injectable()
export class CheckoutRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly ordersService: OrdersService,
        private readonly inventoryService: InventoryService,
        private readonly pointsService: PointsService,
        private readonly paymentsService: PaymentsService,
        private readonly cartService: CartService,
    ) {}

    async place(input: PlaceCheckoutInput): Promise<PlaceCheckoutResult> {
        return await this.prisma.$transaction(async (tx) => {
            const order = await this.ordersService.createOrder(input.order, {
                status: input.order_status_processing
                    ? OrderStatus.PROCESSING
                    : OrderStatus.PENDING,
                tx,
            });

            await this.inventoryService.reserve(
                {
                    order_id: order.id,
                    market_id: input.market_id,
                    warehouse_id: input.warehouse_id,
                    items: input.reserve_items,
                },
                tx,
            );

            if (input.points_to_redeem > 0) {
                if (!input.customer_id) {
                    throw new BadRequestException(
                        'Guests cannot redeem points',
                    );
                }

                await this.pointsService.redeem(
                    input.customer_id,
                    {
                        description: POINT_REASON.PLACE_ORDER,
                        count: input.points_to_redeem,
                    },
                    tx,
                );
            }

            const payment_attempt = await this.paymentsService.createAttempt(
                {
                    order_id: order.id,
                    market_payment_method_id: input.market_payment_method_id,
                    payment_method_name: input.payment_method_name,
                    status: input.payment_attempt_status,
                    ...(input.payment_intent_id !== undefined && {
                        payment_intent_id: input.payment_intent_id,
                    }),
                    ...(input.payment_intent_url !== undefined && {
                        payment_intent_url: input.payment_intent_url,
                    }),
                },
                tx,
            );

            await this.cartService.clearCart(input.cart_id, tx);

            return { order, payment_attempt };
        });
    }
}
