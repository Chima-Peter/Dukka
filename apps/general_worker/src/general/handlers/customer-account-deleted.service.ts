import { Injectable, Logger } from '@nestjs/common';
import {
    AVATAR_BUCKET,
    OrderStatus,
    PrismaService,
    SupabaseService,
} from '@app/common';
import {
    MAIL_TEMPLATES,
    MailQueueService,
    type CustomerAccountDeletedJobPayload,
} from '@app/queues';
import { CancelOrderService } from './cancel-order.service.js';

type BlockingOrder = {
    id: string;
    status: OrderStatus;
    order_number: string;
    currency: string;
    subtotal: { toString(): string };
    shipping_fee: { toString(): string };
    discount_amount: { toString(): string };
    points_discount: { toString(): string };
    coupon_discount: { toString(): string };
    total_amount: { toString(): string };
    shipping_address: unknown;
    created_at: Date;
    market: { name: string };
    order_items: Array<{
        product_name: string;
        quantity: number;
        price: { toString(): string };
        total: { toString(): string };
    }>;
};

const blockingOrderSelect = {
    id: true,
    status: true,
    order_number: true,
    currency: true,
    subtotal: true,
    shipping_fee: true,
    discount_amount: true,
    points_discount: true,
    coupon_discount: true,
    total_amount: true,
    shipping_address: true,
    created_at: true,
    market: {
        select: { name: true },
    },
    order_items: {
        select: {
            product_name: true,
            quantity: true,
            price: true,
            total: true,
        },
        orderBy: { created_at: 'asc' as const },
    },
};

@Injectable()
export class CustomerAccountDeletedService {
    private readonly logger = new Logger(CustomerAccountDeletedService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly supabaseService: SupabaseService,
        private readonly mailQueueService: MailQueueService,
        private readonly cancelOrderService: CancelOrderService,
    ) {}

    async process(payload: CustomerAccountDeletedJobPayload): Promise<void> {
        const { customer_id, email, name } = payload;

        this.logger.log(`Deleting account for customer ${customer_id}`);

        const blocking = await this.prisma.order.findFirst({
            where: {
                customer_id,
                status: {
                    in: [OrderStatus.PROCESSING, OrderStatus.SHIPPED],
                },
            },
            select: blockingOrderSelect,
        });

        if (blocking) {
            if (blocking.status === OrderStatus.PROCESSING) {
                this.logger.log(
                    `Skipped account deletion for ${customer_id}; order ${blocking.id} status=${blocking.status}`,
                );
                await this.mailQueueService.enqueueSend({
                    to: email,
                    subject: 'Your order is still being processed',
                    template: MAIL_TEMPLATES.CUSTOMER_ORDER_PROCESSING,
                    context: this.toOrderMailContext(name, email, blocking),
                });
                return;
            }

            this.logger.log(
                `Skipped account deletion for ${customer_id}; order ${blocking.id} status=${blocking.status}`,
            );
            await this.mailQueueService.enqueueSend({
                to: email,
                subject: 'Your order has been shipped',
                template: MAIL_TEMPLATES.CUSTOMER_ORDER_SHIPPED,
                context: this.toOrderMailContext(name, email, blocking),
            });
            return;
        }

        const pendingOrders = await this.prisma.order.findMany({
            where: {
                customer_id,
                status: OrderStatus.PENDING,
            },
            select: { id: true, order_number: true },
        });

        for (const order of pendingOrders) {
            this.logger.log(
                `Cancelling pending order ${order.order_number} for ${customer_id} before account deletion`,
            );
            await this.cancelOrderService.process({ order_id: order.id });
        }

        const customer = await this.prisma.customer.findUnique({
            where: { id: customer_id },
            select: { id: true, avatar: true },
        });

        if (!customer) {
            this.logger.log(
                `Skipped account deletion for ${customer_id} (already deleted)`,
            );
            return;
        }

        if (customer.avatar) {
            try {
                await this.supabaseService.deleteFile(
                    [customer.avatar],
                    AVATAR_BUCKET,
                );
            } catch (error) {
                this.logger.warn(
                    `Failed to delete avatar for customer ${customer_id}: ${error}`,
                );
            }
        }

        await this.prisma.customer.delete({
            where: { id: customer_id },
        });

        this.logger.log(`Customer deleted ${customer_id}`);

        await this.mailQueueService.enqueueSend({
            to: email,
            subject: 'Your account has been deleted',
            template: MAIL_TEMPLATES.CUSTOMER_ACCOUNT_DELETED,
            context: {
                name,
                email,
            },
        });
    }

    private toOrderMailContext(
        name: string,
        email: string,
        order: BlockingOrder,
    ): Record<string, unknown> {
        const discountTotal =
            Number(order.discount_amount.toString()) +
            Number(order.points_discount.toString()) +
            Number(order.coupon_discount.toString());

        return {
            name,
            email,
            order_number: order.order_number,
            order_status: order.status,
            market_name: order.market.name,
            created_at: order.created_at.toISOString(),
            currency: order.currency,
            shipping_address: this.formatAddress(order.shipping_address),
            items: order.order_items.map((item) => ({
                product_name: item.product_name,
                quantity: item.quantity,
                price: item.price.toString(),
                total: item.total.toString(),
            })),
            subtotal_label: `${order.currency} ${order.subtotal.toString()}`,
            shipping_fee_label: `${order.currency} ${order.shipping_fee.toString()}`,
            discount_label: `${order.currency} ${discountTotal}`,
            total_label: `${order.currency} ${order.total_amount.toString()}`,
        };
    }

    private formatAddress(address: unknown): string {
        if (!address || typeof address !== 'object') {
            return '—';
        }

        const row = address as Record<string, unknown>;
        const name =
            typeof row.first_name === 'string'
                ? [row.first_name, row.last_name].filter(Boolean).join(' ')
                : typeof row.name === 'string'
                  ? row.name
                  : undefined;

        return [
            name,
            row.street_address,
            row.state,
            row.country,
            row.phone_number,
        ]
            .filter((part) => typeof part === 'string' && part.length > 0)
            .join(', ');
    }
}
