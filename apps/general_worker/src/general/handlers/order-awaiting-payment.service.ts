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
    type OrderAwaitingPaymentJobPayload,
} from '@app/queues';

@Injectable()
export class OrderAwaitingPaymentService {
    private readonly logger = new Logger(OrderAwaitingPaymentService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mailQueueService: MailQueueService,
        private readonly notificationPublisher: NotificationPublisher,
    ) {}

    async process(payload: OrderAwaitingPaymentJobPayload): Promise<void> {
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
            },
        });

        if (!order) {
            this.logger.warn(
                `Order ${payload.order_id} not found for order-awaiting-payment job`,
            );
            return;
        }

        if (order.status !== OrderStatus.PENDING) {
            this.logger.log(
                `Skipping order-awaiting-payment for ${order.id} (status=${order.status})`,
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
                `No email for awaiting-payment notice on order ${order.id}`,
            );
        } else {
            await this.mailQueueService.enqueueSend({
                jobId: `order-awaiting-payment-mail-${order.id}`,
                to: email,
                subject: `Complete payment for order #${order.order_number}`,
                template: MAIL_TEMPLATES.CUSTOMER_ORDER_AWAITING_PAYMENT,
                context: {
                    name,
                    email,
                    order_number: order.order_number,
                },
            });

            this.logger.log(
                `Queued awaiting-payment mail for order #${order.order_number}`,
            );
        }

        if (order.customer_id) {
            await this.notificationPublisher.notifyCustomer(order.customer_id, {
                title: 'Awaiting payment',
                type: NotificationType.ORDER,
                text: `Complete payment for order #${order.order_number} to keep your reservation.`,
            });
        }

        this.logger.log(
            `Completed order-awaiting-payment for order #${order.order_number}`,
        );
    }
}
