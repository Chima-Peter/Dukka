import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/common';
import {
    MAIL_TEMPLATES,
    MailQueueService,
    type OrderProcessingJobPayload,
} from '@app/queues';

@Injectable()
export class OrderProcessingService {
    private readonly logger = new Logger(OrderProcessingService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mailQueueService: MailQueueService,
    ) {}

    async process(payload: OrderProcessingJobPayload): Promise<void> {
        const order = await this.prisma.order.findUnique({
            where: { id: payload.order_id },
            select: {
                id: true,
                order_number: true,
                guest_email: true,
                guest_name: true,
                customer: {
                    select: { email: true, name: true },
                },
            },
        });

        if (!order) {
            this.logger.warn(
                `Order ${payload.order_id} not found for order-processing job`,
            );
            return;
        }

        const email = order.customer?.email ?? order.guest_email;
        if (!email) {
            this.logger.warn(
                `No email for order-processing notice on order ${order.id}`,
            );
            return;
        }

        const name =
            order.customer?.name ?? order.guest_name ?? email.split('@')[0];

        await this.mailQueueService.enqueueSend({
            to: email,
            subject: `Your order #${order.order_number} is being processed`,
            template: MAIL_TEMPLATES.CUSTOMER_ORDER_PROCESSING,
            context: {
                name,
                email,
                order_number: order.order_number,
            },
        });

        this.logger.log(
            `Queued order-processing mail for order ${order.order_number}`,
        );
    }
}
