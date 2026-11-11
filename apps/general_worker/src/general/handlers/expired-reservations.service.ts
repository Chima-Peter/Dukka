import { Injectable, Logger } from '@nestjs/common';
import {
    NotificationPublisher,
    NotificationType,
    OrderInventoryStatus,
    OrderPaymentAttemptStatus,
    PrismaService,
} from '@app/common';
import {
    MAIL_TEMPLATES,
    MailQueueService,
    type ExpiredReservationsJobPayload,
} from '@app/queues';

type LockedReservation = {
    id: string;
    order_id: string;
    warehouse_id: string;
};

@Injectable()
export class ExpiredReservationsService {
    private readonly logger = new Logger(ExpiredReservationsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mailQueueService: MailQueueService,
        private readonly notificationPublisher: NotificationPublisher,
    ) {}

    async process(
        payload: ExpiredReservationsJobPayload,
    ): Promise<void> {
        const expired = await this.prisma.$transaction(async (tx) => {
            const locked = await tx.$queryRaw<LockedReservation[]>`
                SELECT oi.id, oi.order_id, oi.warehouse_id
                FROM "OrderInventory" oi
                WHERE oi.id = ${payload.order_inventory_id}
                  AND oi.expires_at <= NOW()
                  AND oi.status = ${OrderInventoryStatus.PENDING}::"OrderInventoryStatus"
                FOR UPDATE OF oi
            `;

            if (locked.length === 0) {
                return null;
            }

            const reservation = locked[0];

            const lineItems = await tx.inventoryLineItem.findMany({
                where: { order_inventory_id: reservation.id },
                select: {
                    market_variant_id: true,
                    quantity: true,
                },
            });

            for (const line of lineItems) {
                const updated = await tx.inventory.updateManyAndReturn({
                    where: {
                        warehouse_id: reservation.warehouse_id,
                        market_variant_id: line.market_variant_id,
                        reserved_quantity: { gte: line.quantity },
                    },
                    data: {
                        available_quantity: { increment: line.quantity },
                        reserved_quantity: { decrement: line.quantity },
                    },
                    select: {
                        available_quantity: true,
                        reserved_quantity: true,
                    },
                });

                if (updated.length === 0) {
                    throw new Error(
                        `No inventory for market variant ${line.market_variant_id} in warehouse ${reservation.warehouse_id}`,
                    );
                }
            }

            await tx.orderInventory.update({
                where: { id: reservation.id },
                data: { status: OrderInventoryStatus.EXPIRED },
            });

            await tx.orderPaymentAttempt.updateMany({
                where: {
                    order_id: reservation.order_id,
                    status: OrderPaymentAttemptStatus.PENDING,
                },
                data: {
                    status: OrderPaymentAttemptStatus.FAILED,
                },
            });

            return reservation;
        });

        if (!expired) {
            this.logger.log(
                `Skipped expired-reservations for ${payload.order_inventory_id} (inventory booking not eligible)`,
            );
            return;
        }

        this.logger.log(
            `Reverted expired inventory booking ${expired.id}`,
        );

        await this.notifyPaymentExpired(expired.order_id);
    }

    private async notifyPaymentExpired(orderId: string): Promise<void> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: {
                id: true,
                order_number: true,
                customer_id: true,
                guest_email: true,
                guest_name: true,
                customer: {
                    select: { email: true, name: true },
                },
                warehouse: {
                    select: {
                        manager_id: true,
                        name: true,
                    },
                },
            },
        });

        if (!order) {
            this.logger.warn(
                `Order ${orderId} not found for payment-expired notice`,
            );
            return;
        }

        const email = order.customer?.email ?? order.guest_email;
        const name =
            order.customer?.name ??
            order.guest_name ??
            (email ? email.split('@')[0] : null);

        if (!email || !name) {
            this.logger.warn(
                `No email for payment-expired notice on order ${order.id}`,
            );
        } else {
            await this.mailQueueService.enqueueSend({
                jobId: `order-payment-expired-mail-${order.id}`,
                to: email,
                subject: `Payment expired for order #${order.order_number}`,
                template: MAIL_TEMPLATES.CUSTOMER_ORDER_PAYMENT_EXPIRED,
                context: {
                    name,
                    email,
                    order_number: order.order_number,
                },
            });
        }

        if (order.customer_id) {
            await this.notificationPublisher.notifyCustomer(order.customer_id, {
                title: 'Payment expired',
                type: NotificationType.ORDER,
                text: `Payment for order #${order.order_number} expired and the reservation was released.`,
            });
        }

        if (order.warehouse?.manager_id) {
            await this.notificationPublisher.notifyStaff(
                order.warehouse.manager_id,
                {
                    title: 'Payment expired',
                    type: NotificationType.ORDER,
                    text: `Order #${order.order_number} payment expired; reservation released at ${order.warehouse.name}.`,
                },
            );
        }
    }
}
