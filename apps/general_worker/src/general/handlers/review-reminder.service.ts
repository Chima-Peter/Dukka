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
    type ReviewReminderJobPayload,
} from '@app/queues';

@Injectable()
export class ReviewReminderService {
    private readonly logger = new Logger(ReviewReminderService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mailQueueService: MailQueueService,
        private readonly notificationPublisher: NotificationPublisher,
    ) {}

    async process(payload: ReviewReminderJobPayload): Promise<void> {
        const order = await this.prisma.order.findUnique({
            where: { id: payload.order_id },
            select: {
                id: true,
                order_number: true,
                status: true,
                customer_id: true,
                review_reminder_sent: true,
                delivered_at: true,
                customer: {
                    select: { email: true, name: true },
                },
                order_items: {
                    select: {
                        market_variant_id: true,
                        product_name: true,
                    },
                },
            },
        });

        if (!order) {
            this.logger.warn(
                `Order ${payload.order_id} not found for review-reminder job`,
            );
            return;
        }

        if (
            order.status !== OrderStatus.DELIVERED ||
            order.review_reminder_sent ||
            !order.customer_id ||
            !order.customer
        ) {
            this.logger.log(
                `Skipping review reminder for order ${order.id} (ineligible)`,
            );
            return;
        }

        const reviewableItems = order.order_items.filter(
            (item): item is { market_variant_id: string; product_name: string } =>
                item.market_variant_id !== null,
        );

        const variantIds = [
            ...new Set(reviewableItems.map((item) => item.market_variant_id)),
        ];

        if (variantIds.length === 0) {
            await this.markSent(order.id);
            this.logger.log(
                `Marked review reminder sent for order ${order.id} (no reviewable items)`,
            );
            return;
        }

        const reviewed = await this.prisma.reviews.findMany({
            where: {
                customer_id: order.customer_id,
                market_variant_id: { in: variantIds },
            },
            select: { market_variant_id: true },
            distinct: ['market_variant_id'],
        });
        const reviewedIds = new Set(
            reviewed.map((row) => row.market_variant_id),
        );

        const pendingByVariant = new Map<
            string,
            { market_variant_id: string; product_name: string }
        >();
        for (const item of reviewableItems) {
            if (
                !reviewedIds.has(item.market_variant_id) &&
                !pendingByVariant.has(item.market_variant_id)
            ) {
                pendingByVariant.set(item.market_variant_id, item);
            }
        }
        const pendingItems = [...pendingByVariant.values()];

        if (pendingItems.length === 0) {
            await this.markSent(order.id);
            this.logger.log(
                `Marked review reminder sent for order ${order.id} (already reviewed)`,
            );
            return;
        }

        const customerId = order.customer_id;
        const { email, name } = order.customer;
        await this.mailQueueService.enqueueSendMany(
            pendingItems.map((item) => ({
                to: email,
                subject: `How was ${item.product_name}?`,
                template: MAIL_TEMPLATES.CUSTOMER_REVIEW_REMINDER,
                context: {
                    name,
                    email,
                    order_number: order.order_number,
                    product_name: item.product_name,
                },
            })),
        );

        await Promise.all(
            pendingItems.map((item) =>
                this.notificationPublisher.notifyCustomer(customerId, {
                    title: 'Leave a review',
                    type: NotificationType.ORDER,
                    text: `How was ${item.product_name} from order #${order.order_number}? Tell us what you think!`,
                }),
            ),
        );

        await this.markSent(order.id);

        this.logger.log(
            `Sent ${pendingItems.length} review reminder(s) for order #${order.order_number}`,
        );
    }

    private async markSent(orderId: string): Promise<void> {
        await this.prisma.order.updateMany({
            where: {
                id: orderId,
                review_reminder_sent: false,
            },
            data: {
                review_reminder_sent: true,
                review_reminder_sent_at: new Date(),
            },
        });
    }
}
