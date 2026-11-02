import { Injectable, Logger } from '@nestjs/common';
import {
    NotificationPublisher,
    NotificationType,
    OrderInventoryStatus,
    PrismaService,
} from '@app/common';
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
        private readonly notificationPublisher: NotificationPublisher,
    ) {}

    async process(payload: OrderProcessingJobPayload): Promise<void> {
        const order = await this.prisma.order.findUnique({
            where: { id: payload.order_id },
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
                        id: true,
                        name: true,
                        manager_id: true,
                    },
                },
                order_inventory: {
                    select: {
                        id: true,
                        status: true,
                    },
                },
            },
        });

        if (!order) {
            this.logger.warn(
                `Order ${payload.order_id} not found for order-processing job`,
            );
            return;
        }

        await this.completeOrderInventory(order);

        const email = order.customer?.email ?? order.guest_email;
        if (!email) {
            this.logger.warn(
                `No email for order-processing notice on order ${order.id}`,
            );
        } else {
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

        if (order.customer_id) {
            await this.notificationPublisher.notifyCustomer(order.customer_id, {
                title: 'Order processing',
                type: NotificationType.ORDER,
                text: `Your order #${order.order_number} is being processed.`,
            });
        }

        if (order.warehouse?.manager_id) {
            await this.notificationPublisher.notifyStaff(
                order.warehouse.manager_id,
                {
                    title: 'New order to fulfill',
                    type: NotificationType.ORDER,
                    text: `Order #${order.order_number} is ready for fulfillment at ${order.warehouse.name}.`,
                },
            );
        }
    }

    private async completeOrderInventory(order: {
        id: string;
        order_number: string;
        order_inventory: { id: string; status: OrderInventoryStatus } | null;
    }): Promise<void> {
        const inventory = order.order_inventory;
        if (!inventory) {
            this.logger.warn(
                `No order inventory for order ${order.id}; skipping completion`,
            );
            return;
        }

        if (inventory.status !== OrderInventoryStatus.PENDING) {
            this.logger.log(
                `Order inventory ${inventory.id} already ${inventory.status}; skipping completion`,
            );
            return;
        }

        await this.prisma.$transaction(async (tx) => {
            const claimed = await tx.orderInventory.updateManyAndReturn({
                where: {
                    id: inventory.id,
                    status: OrderInventoryStatus.PENDING,
                },
                data: { status: OrderInventoryStatus.SUCCESS },
                select: {
                    id: true,
                    warehouse_id: true,
                },
            });

            if (claimed.length === 0) {
                this.logger.log(
                    `Order inventory ${inventory.id} was not PENDING; skipping completion`,
                );
                return;
            }

            const row = claimed[0];
            const lineItems = await tx.inventoryLineItem.findMany({
                where: { order_inventory_id: row.id },
                select: {
                    market_variant_id: true,
                    quantity: true,
                },
            });

            for (const line of lineItems) {
                const updated = await tx.inventory.updateManyAndReturn({
                    where: {
                        warehouse_id: row.warehouse_id,
                        market_variant_id: line.market_variant_id,
                        reserved_quantity: { gte: line.quantity },
                    },
                    data: {
                        reserved_quantity: { decrement: line.quantity },
                    },
                    select: {
                        reserved_quantity: true,
                    },
                });

                if (updated.length === 0) {
                    throw new Error(
                        `No inventory for market variant ${line.market_variant_id} in warehouse ${row.warehouse_id}`,
                    );
                }
            }
        });

        this.logger.log(
            `Completed order inventory ${inventory.id} for order #${order.order_number}`,
        );
    }
}
