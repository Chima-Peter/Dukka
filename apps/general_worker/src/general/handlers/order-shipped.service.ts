import { Injectable, Logger } from '@nestjs/common';
import {
    NotificationPublisher,
    NotificationType,
    OrderStatus,
    PrismaService,
} from '@app/common';
import {
    MAIL_TEMPLATES,
    MailQueueService,
    type OrderShippedJobPayload,
} from '@app/queues';

@Injectable()
export class OrderShippedService {
    private readonly logger = new Logger(OrderShippedService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mailQueueService: MailQueueService,
        private readonly notificationPublisher: NotificationPublisher,
    ) {}

    async process(payload: OrderShippedJobPayload): Promise<void> {
        const order = await this.prisma.order.findUnique({
            where: { id: payload.order_id },
            select: {
                id: true,
                order_number: true,
                status: true,
                customer_id: true,
                guest_email: true,
                guest_name: true,
                customer: {
                    select: { email: true, name: true },
                },
                shipment: {
                    select: { tracking_number: true },
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
                `Order ${payload.order_id} not found for order-shipped job`,
            );
            return;
        }

        if (order.status !== OrderStatus.SHIPPED) {
            this.logger.log(
                `Skipping order-shipped for ${order.id} (status=${order.status})`,
            );
            return;
        }

        const trackingNumber =
            payload.tracking_number ?? order.shipment?.tracking_number ?? null;
        const email = order.customer?.email ?? order.guest_email;
        const name =
            order.customer?.name ??
            order.guest_name ??
            (email ? email.split('@')[0] : null);

        if (!email || !name) {
            this.logger.warn(
                `No email for order-shipped notice on order ${order.id}`,
            );
        } else {
            await this.mailQueueService.enqueueSend({
                jobId: `order-shipped-mail-${order.id}`,
                to: email,
                subject: `Your order #${order.order_number} has shipped`,
                template: MAIL_TEMPLATES.CUSTOMER_ORDER_SHIPPED,
                context: {
                    name,
                    email,
                    order_number: order.order_number,
                    ...(trackingNumber && {
                        tracking_number: trackingNumber,
                    }),
                },
            });

            this.logger.log(
                `Queued order-shipped mail for order #${order.order_number}`,
            );
        }

        if (order.customer_id) {
            await this.notificationPublisher.notifyCustomer(order.customer_id, {
                title: 'Order shipped',
                type: NotificationType.ORDER,
                text: trackingNumber
                    ? `Your order #${order.order_number} has shipped. Tracking: ${trackingNumber}.`
                    : `Your order #${order.order_number} has shipped.`,
            });
        }

        if (order.warehouse?.manager_id) {
            await this.notificationPublisher.notifyStaff(
                order.warehouse.manager_id,
                {
                    title: 'Order shipped',
                    type: NotificationType.LOGISTICS,
                    text: `Order #${order.order_number} left ${order.warehouse.name} and is now in transit.`,
                },
            );
        }

        this.logger.log(
            `Completed order-shipped for order #${order.order_number}`,
        );
    }
}
