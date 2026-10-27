import { Injectable, Logger } from '@nestjs/common';
import {
    OrderInventoryStatus,
    OrderPaymentAttemptStatus,
    OrderStatus,
    PrismaService,
} from '@app/common';
import {
    MAIL_TEMPLATES,
    MailQueueService,
    type CancelOrderJobPayload,
} from '@app/queues';

type LockedOrder = {
    id: string;
    order_number: string;
    inventory_id: string | null;
    warehouse_id: string | null;
    status: OrderStatus;
};

type CancelResult =
    | {
          ok: true;
          id: string;
          order_number: string;
          status: OrderStatus;
      }
    | {
          ok: false;
          reason: 'ineligible_status';
          id: string;
          order_number: string;
          status: OrderStatus;
      };

@Injectable()
export class CancelOrderService {
    private readonly logger = new Logger(CancelOrderService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mailQueueService: MailQueueService,
    ) {}

    async process(payload: CancelOrderJobPayload): Promise<void> {
        // first send request to provider to cancel payment attempt
        const result = await this.prisma.$transaction(async (tx) => {
            const locked = await tx.$queryRaw<LockedOrder[]>`
                SELECT o.id,
                       o.order_number,
                       oi.id AS inventory_id,
                       oi.warehouse_id,
                       o.status
                FROM "Order" o
                LEFT JOIN "OrderInventory" oi
                  ON oi.order_id = o.id
                 AND oi.status = ${OrderInventoryStatus.PENDING}::"OrderInventoryStatus"
                WHERE o.id = ${payload.order_id}::uuid
                FOR UPDATE OF o, oi
            `;

            if (locked.length === 0) {
                return null;
            }

            const order = locked[0];

            if (
                order.status !== OrderStatus.PENDING &&
                order.status !== OrderStatus.PROCESSING
            ) {
                return {
                    ok: false,
                    reason: 'ineligible_status',
                    id: order.id,
                    order_number: order.order_number,
                    status: order.status,
                } satisfies CancelResult;
            }

            if (order.inventory_id && order.warehouse_id) {
                const lineItems = await tx.inventoryLineItem.findMany({
                    where: { order_inventory_id: order.inventory_id },
                    select: {
                        market_variant_id: true,
                        quantity: true,
                    },
                });

                for (const line of lineItems) {
                    const updated = await tx.inventory.updateManyAndReturn({
                        where: {
                            warehouse_id: order.warehouse_id,
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
                            `No inventory for market variant ${line.market_variant_id} in warehouse ${order.warehouse_id}`,
                        );
                    }
                }

                await tx.orderInventory.update({
                    where: { id: order.inventory_id },
                    data: { status: OrderInventoryStatus.CLOSED },
                });
            }

            await tx.order.update({
                where: { id: order.id },
                data: { status: OrderStatus.CANCELLED },
            });

            await tx.orderPaymentAttempt.updateMany({
                where: {
                    order_id: order.id,
                    status: OrderPaymentAttemptStatus.PENDING,
                },
                data: {
                    status: OrderPaymentAttemptStatus.FAILED,
                },
            });

            return {
                ok: true,
                id: order.id,
                order_number: order.order_number,
                status: order.status,
            } satisfies CancelResult;
        });

        if (!result) {
            this.logger.log(
                `Skipped cancel-order for ${payload.order_id} (order not found)`,
            );
            return;
        }

        if (!result.ok) {
            this.logger.log(
                `Skipped cancel-order for ${result.id} (status=${result.status})`,
            );
            await this.notifyCancelBlocked(result);
            return;
        }

        this.logger.log(`Cancelled order ${result.id}`);
        await this.notifyCancelled(result);

        if (result.status === OrderStatus.PROCESSING) {
            // TODO: enqueue refund job for order
        }
    }

    private async resolveRecipient(orderId: string): Promise<{
        email: string;
        name: string;
    } | null> {
        const row = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: {
                guest_email: true,
                guest_name: true,
                customer: {
                    select: { email: true, name: true },
                },
            },
        });

        const email = row?.customer?.email ?? row?.guest_email;
        if (!email) {
            return null;
        }

        return {
            email,
            name: row?.customer?.name ?? row?.guest_name ?? email.split('@')[0],
        };
    }

    private async notifyCancelled(order: {
        id: string;
        order_number: string;
        status: OrderStatus;
    }): Promise<void> {
        const recipient = await this.resolveRecipient(order.id);
        if (!recipient) {
            this.logger.warn(
                `No email for cancel notice on order ${order.id}`,
            );
            return;
        }

        await this.mailQueueService.enqueueSend({
            to: recipient.email,
            subject: `Your order #${order.order_number} has been cancelled`,
            template: MAIL_TEMPLATES.CUSTOMER_ORDER_CANCELLED,
            context: {
                name: recipient.name,
                email: recipient.email,
                order_number: order.order_number,
                refund_pending: order.status === OrderStatus.PROCESSING,
            },
        });
    }

    private async notifyCancelBlocked(order: {
        id: string;
        order_number: string;
        status: OrderStatus;
    }): Promise<void> {
        if (order.status === OrderStatus.CANCELLED) {
            return;
        }

        const recipient = await this.resolveRecipient(order.id);
        if (!recipient) {
            this.logger.warn(
                `No email for cancel-blocked notice on order ${order.id}`,
            );
            return;
        }

        await this.mailQueueService.enqueueSend({
            to: recipient.email,
            subject: `We could not cancel your order #${order.order_number}`,
            template: MAIL_TEMPLATES.CUSTOMER_ORDER_CANCEL_BLOCKED,
            context: {
                name: recipient.name,
                email: recipient.email,
                order_number: order.order_number,
                order_status_label: this.toStatusLabel(order.status),
            },
        });
    }

    private toStatusLabel(status: OrderStatus): string {
        switch (status) {
            case OrderStatus.SHIPPED:
                return 'on its way to you';
            case OrderStatus.DELIVERED:
                return 'delivered';
            case OrderStatus.PROCESSING:
                return 'being prepared';
            case OrderStatus.PENDING:
                return 'awaiting payment';
            case OrderStatus.CANCELLED:
                return 'cancelled';
        }
    }
}
