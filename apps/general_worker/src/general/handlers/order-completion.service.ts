import { Injectable, Logger } from '@nestjs/common';
import {
    NotificationPublisher,
    NotificationType,
    OrderStatus,
    POINT_REASON,
    POINT_STATUS,
    PrismaService,
} from '@app/common';
import {
    MAIL_TEMPLATES,
    MailQueueService,
    type OrderCompletionJobPayload,
} from '@app/queues';

@Injectable()
export class OrderCompletionService {
    private readonly logger = new Logger(OrderCompletionService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mailQueueService: MailQueueService,
        private readonly notificationPublisher: NotificationPublisher,
    ) {}

    async process(payload: OrderCompletionJobPayload): Promise<void> {
        const order = await this.prisma.order.findUnique({
            where: { id: payload.order_id },
            select: {
                id: true,
                order_number: true,
                status: true,
                total_amount: true,
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
                `Order ${payload.order_id} not found for order-completion job`,
            );
            return;
        }

        if (order.status !== OrderStatus.DELIVERED) {
            this.logger.log(
                `Skipping order-completion for ${order.id} (status=${order.status})`,
            );
            return;
        }

        const email = order.customer?.email ?? order.guest_email;
        const name =
            order.customer?.name ??
            order.guest_name ??
            (email ? email.split('@')[0] : null);

        let pointsEarned = 0;
        if (order.customer_id) {
            pointsEarned = await this.awardCompletionPoints(
                order.customer_id,
                order.total_amount,
            );
        }

        if (!email || !name) {
            this.logger.warn(
                `No email for order-completion notice on order ${order.id}`,
            );
        } else {
            await this.mailQueueService.enqueueSend({
                jobId: `order-completion-mail-${order.id}`,
                to: email,
                subject: `Your order #${order.order_number} has been delivered`,
                template: MAIL_TEMPLATES.CUSTOMER_ORDER_COMPLETED,
                context: {
                    name,
                    email,
                    order_number: order.order_number,
                    ...(pointsEarned > 0 && {
                        points_earned: String(pointsEarned),
                    }),
                },
            });

            this.logger.log(
                `Queued order-completion mail for order #${order.order_number}`,
            );
        }

        if (order.customer_id) {
            const pointsText =
                pointsEarned > 0
                    ? ` You earned ${pointsEarned} points.`
                    : '';
            await this.notificationPublisher.notifyCustomer(order.customer_id, {
                title: 'Order delivered',
                type: NotificationType.ORDER,
                text: `Your order #${order.order_number} has been delivered. Thanks for shopping with Dukka.${pointsText}`,
            });
        }

        this.logger.log(
            `Completed order-completion for order #${order.order_number}`,
        );
    }

    private async awardCompletionPoints(
        customerId: string,
        totalAmount: { toString(): string },
    ): Promise<number> {
        const pointsEarned = Math.floor(Number(totalAmount.toString()) * 0.01);
        if (pointsEarned < 1) {
            this.logger.log(
                `No completion points for customer ${customerId} (1% of total < 1)`,
            );
            return 0;
        }

        const historyData = {
            status: POINT_STATUS.EARNED,
            description: POINT_REASON.COMPLETE_ORDER,
            count: pointsEarned,
        };

        const { points_history, ...points } = await this.prisma.points.upsert({
            where: { customer_id: customerId },
            create: {
                customer: { connect: { id: customerId } },
                balance: pointsEarned,
                points_history: { create: historyData },
            },
            update: {
                balance: { increment: pointsEarned },
                points_history: { create: historyData },
            },
            include: {
                points_history: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                },
            },
        });

        this.logger.log(
            `Awarded ${pointsEarned} completion points to customer ${customerId}; balance=${points.balance}; history=${points_history[0]?.id}`,
        );

        await this.notificationPublisher.notifyCustomer(customerId, {
            title: 'Points earned',
            type: NotificationType.POINTS,
            text: `You earned ${pointsEarned} points. New balance: ${points.balance}.`,
        });

        return pointsEarned;
    }
}
