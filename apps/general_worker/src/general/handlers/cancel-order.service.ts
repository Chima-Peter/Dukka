import { Injectable, Logger } from '@nestjs/common';
import {
    NotificationPublisher,
    NotificationType,
    OrderInventoryStatus,
    OrderPaymentAttemptStatus,
    OrderRefundStatus,
    OrderStatus,
    Prisma,
    PrismaService,
    ShipmentStatus,
} from '@app/common';
import {
    MAIL_TEMPLATES,
    MailQueueService,
    type CancelOrderJobPayload,
} from '@app/queues';
import { PaystackService } from '../../paystack/index.js';

type LockedOrder = {
    id: string;
    order_number: string;
    currency: string;
    total_amount: Prisma.Decimal;
    inventory_id: string | null;
    warehouse_id: string | null;
    inventory_status: OrderInventoryStatus | null;
    status: OrderStatus;
    payment_method_name: string | null;
    payment_attempt_id: string | null;
    payment_intent_id: string | null;
    payment_status: OrderPaymentAttemptStatus | null;
};

type CancelResult =
    | {
          ok: true;
          id: string;
          order_number: string;
          status: OrderStatus;
          is_cash: boolean;
          is_paystack: boolean;
          currency: string;
          total_amount: Prisma.Decimal;
          payment_attempt_id: string | null;
          payment_intent_id: string | null;
          payment_status: OrderPaymentAttemptStatus | null;
      }
    | {
          ok: false;
          reason: 'ineligible_status';
          id: string;
          order_number: string;
          status: OrderStatus;
          is_paystack: boolean;
          currency: string;
          total_amount: Prisma.Decimal;
          payment_attempt_id: string | null;
          payment_intent_id: string | null;
          payment_status: OrderPaymentAttemptStatus | null;
      };

const ACTIVE_REFUND_STATUSES = new Set([
    'pending',
    'processing',
    'processed',
    'success',
]);

@Injectable()
export class CancelOrderService {
    private readonly logger = new Logger(CancelOrderService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mailQueueService: MailQueueService,
        private readonly notificationPublisher: NotificationPublisher,
        private readonly paystackService: PaystackService,
    ) {}

    async process(payload: CancelOrderJobPayload): Promise<void> {
        const result = await this.prisma.$transaction(async (tx) => {
            const locked = await tx.$queryRaw<LockedOrder[]>`
                SELECT o.id,
                       o.order_number,
                       o.currency,
                       o.total_amount,
                       oi.id AS inventory_id,
                       oi.warehouse_id,
                       oi.status AS inventory_status,
                       o.status,
                       opa.id AS payment_attempt_id,
                       opa.payment_method_name,
                       opa.payment_intent_id,
                       opa.status AS payment_status
                FROM "Order" o
                LEFT JOIN "OrderInventory" oi
                  ON oi.order_id = o.id
                LEFT JOIN "OrderPaymentAttempt" opa
                  ON opa.order_id = o.id
                WHERE o.id = ${payload.order_id}
                FOR UPDATE OF o, oi
            `;

            if (locked.length === 0) {
                return null;
            }

            const order = locked[0];
            const method = order.payment_method_name?.toLowerCase() ?? '';
            const isCash = method === 'cash';
            const isPaystack = method === 'paystack';
            const alreadyCancelled =
                order.status === OrderStatus.CANCELLED;

            if (
                !alreadyCancelled &&
                order.status !== OrderStatus.PENDING &&
                order.status !== OrderStatus.PROCESSING
            ) {
                return {
                    ok: false,
                    reason: 'ineligible_status',
                    id: order.id,
                    order_number: order.order_number,
                    status: order.status,
                    is_paystack: isPaystack,
                    currency: order.currency,
                    total_amount: order.total_amount,
                    payment_attempt_id: order.payment_attempt_id,
                    payment_intent_id: order.payment_intent_id,
                    payment_status: order.payment_status,
                } satisfies CancelResult;
            }

            if (
                order.inventory_id &&
                order.warehouse_id &&
                order.inventory_status
            ) {
                await this.releaseInventoryIfNeeded(tx, {
                    inventory_id: order.inventory_id,
                    warehouse_id: order.warehouse_id,
                    inventory_status: order.inventory_status,
                });
            }

            // API callers mark CANCELLED immediately; general-worker callers
            // still need the status flip here.
            if (!alreadyCancelled) {
                await tx.order.update({
                    where: { id: order.id },
                    data: { status: OrderStatus.CANCELLED },
                });
            }

            await this.cancelShipmentIfNeeded(tx, order.id);

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
                status: alreadyCancelled
                    ? OrderStatus.CANCELLED
                    : order.status,
                is_cash: isCash,
                is_paystack: isPaystack,
                currency: order.currency,
                total_amount: order.total_amount,
                payment_attempt_id: order.payment_attempt_id,
                payment_intent_id: order.payment_intent_id,
                payment_status: order.payment_status,
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

        this.logger.log(
            `Cancelled order ${result.id}${result.is_cash ? ' (cash)' : result.is_paystack ? ' (paystack)' : ''}`,
        );

        let refundPending = false;
        if (result.is_paystack) {
            const refund = await this.issuePaystackRefundIfNeeded(result);
            refundPending = refund === 'issued' || refund === 'pending';
        }

        await this.notifyCancelled({
            ...result,
            refund_pending: refundPending,
        });
    }

    private async issuePaystackRefundIfNeeded(input: {
        id: string;
        order_number: string;
        is_paystack: boolean;
        currency: string;
        total_amount: Prisma.Decimal;
        payment_attempt_id: string | null;
        payment_intent_id: string | null;
        payment_status: OrderPaymentAttemptStatus | null;
    }): Promise<'issued' | 'pending' | 'processed' | 'not_needed'> {
        if (!input.is_paystack) {
            return 'not_needed';
        }

        if (
            input.payment_status !== OrderPaymentAttemptStatus.SUCCESS ||
            !input.payment_intent_id
        ) {
            this.logger.log(
                `No successful Paystack payment to refund for order ${input.id}`,
            );
            return 'not_needed';
        }

        const transaction = input.payment_intent_id;
        const customerNote = `Refund for cancelled order #${input.order_number}`;
        const merchantNote = `Order #${input.order_number} cancelled`;

        const [verified, localRefunds, paystackRefunds] = await Promise.all([
            this.paystackService.verifyTransaction(transaction),
            this.prisma.orderRefund.findMany({
                where: {
                    order_id: input.id,
                    payment_reference: transaction,
                },
                select: {
                    id: true,
                    status: true,
                },
                orderBy: { created_at: 'desc' },
            }),
            this.paystackService.listRefunds({
                transaction,
                currency: input.currency,
                perPage: 50,
                page: 1,
            }),
        ]);

        if (verified.status.toLowerCase() !== 'success') {
            this.logger.log(
                `Paystack txn ${transaction} status=${verified.status}; skipping refund for order ${input.id}`,
            );
            return 'not_needed';
        }

        if (
            localRefunds.some(
                (refund) => refund.status === OrderRefundStatus.PENDING,
            )
        ) {
            this.logger.log(
                `Local pending OrderRefund already exists for order ${input.id}; skipping create`,
            );
            return 'pending';
        }

        if (
            localRefunds.some(
                (refund) => refund.status === OrderRefundStatus.PROCESSED,
            )
        ) {
            this.logger.log(
                `Local processed OrderRefund already exists for order ${input.id}; skipping create`,
            );
            return 'processed';
        }

        const existingPaystack = (paystackRefunds ?? []).find((refund) =>
            ACTIVE_REFUND_STATUSES.has(refund.status.toLowerCase()),
        );
        if (existingPaystack) {
            const status = existingPaystack.status.toLowerCase();
            this.logger.log(
                `Paystack refund already exists id=${existingPaystack.id} status=${existingPaystack.status} for order ${input.id}`,
            );
            if (status === 'processed' || status === 'success') {
                return 'processed';
            }
            return 'pending';
        }

        const createdLocal = await this.prisma.orderRefund.create({
            data: {
                amount: input.total_amount,
                currency: input.currency,
                provider: 'paystack',
                payment_reference: transaction,
                order_id: input.id,
                status: OrderRefundStatus.PENDING,
                customer_note: customerNote,
                merchant_note: merchantNote,
                metadata: {
                    actor: {
                        type: 'system',
                        source: 'cancel_order',
                    },
                },
                ...(input.payment_attempt_id
                    ? { order_payment_attempt_id: input.payment_attempt_id }
                    : {}),
            },
            select: { id: true },
        });

        try {
            const created = await this.paystackService.createRefund({
                transaction,
                reference: createdLocal.id,
                currency: input.currency,
                merchant_note: merchantNote,
                customer_note: customerNote,
            });

            await this.prisma.orderRefund.update({
                where: { id: createdLocal.id },
                data: { provider_refund_id: String(created.id) },
            });

            this.logger.log(
                `Issued Paystack refund id=${created.id} reference=${createdLocal.id} status=${created.status} for order ${input.id}`,
            );

            const createdStatus = created.status.toLowerCase();
            if (createdStatus === 'processed' || createdStatus === 'success') {
                return 'processed';
            }
            return 'issued';
        } catch (error) {
            await this.prisma.orderRefund.updateMany({
                where: {
                    id: createdLocal.id,
                    status: OrderRefundStatus.PENDING,
                },
                data: { status: OrderRefundStatus.FAILED },
            });
            this.logger.error(
                `Paystack refund create failed for OrderRefund ${createdLocal.id} order ${input.id}: ${error}`,
            );
            throw error;
        }
    }

    private async cancelShipmentIfNeeded(
        tx: Prisma.TransactionClient,
        orderId: string,
    ): Promise<void> {
        const updated = await tx.shipment.updateManyAndReturn({
            where: {
                order_id: orderId,
                status: {
                    in: [ShipmentStatus.PENDING, ShipmentStatus.SHIPPED],
                },
            },
            data: { status: ShipmentStatus.CANCELLED },
            select: { id: true, tracking_number: true, status: true },
        });

        if (updated.length === 0) {
            return;
        }

        this.logger.log(
            `Cancelled shipment ${updated[0].id} (${updated[0].tracking_number}) for order ${orderId}`,
        );
    }

    private async releaseInventoryIfNeeded(
        tx: Prisma.TransactionClient,
        input: {
            inventory_id: string;
            warehouse_id: string;
            inventory_status: OrderInventoryStatus;
        },
    ): Promise<void> {
        if (
            input.inventory_status === OrderInventoryStatus.CLOSED ||
            input.inventory_status === OrderInventoryStatus.EXPIRED
        ) {
            if (input.inventory_status === OrderInventoryStatus.EXPIRED) {
                await tx.orderInventory.update({
                    where: { id: input.inventory_id },
                    data: { status: OrderInventoryStatus.CLOSED },
                });
            }
            return;
        }

        const lineItems = await tx.inventoryLineItem.findMany({
            where: { order_inventory_id: input.inventory_id },
            select: {
                market_variant_id: true,
                quantity: true,
            },
        });

        for (const line of lineItems) {
            if (input.inventory_status === OrderInventoryStatus.PENDING) {
                const updated = await tx.inventory.updateManyAndReturn({
                    where: {
                        warehouse_id: input.warehouse_id,
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
                        `No reserved inventory for market variant ${line.market_variant_id} in warehouse ${input.warehouse_id}`,
                    );
                }
            } else if (
                input.inventory_status === OrderInventoryStatus.SUCCESS
            ) {
                const updated = await tx.inventory.updateManyAndReturn({
                    where: {
                        warehouse_id: input.warehouse_id,
                        market_variant_id: line.market_variant_id,
                    },
                    data: {
                        available_quantity: { increment: line.quantity },
                    },
                    select: {
                        available_quantity: true,
                    },
                });

                if (updated.length === 0) {
                    throw new Error(
                        `No inventory for market variant ${line.market_variant_id} in warehouse ${input.warehouse_id}`,
                    );
                }
            }
        }

        await tx.orderInventory.update({
            where: { id: input.inventory_id },
            data: { status: OrderInventoryStatus.CLOSED },
        });
    }

    private async resolveRecipient(orderId: string): Promise<{
        email: string | null;
        name: string | null;
        customer_id: string | null;
    }> {
        const row = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: {
                customer_id: true,
                guest_email: true,
                guest_name: true,
                customer: {
                    select: { email: true, name: true },
                },
            },
        });

        const email = row?.customer?.email ?? row?.guest_email ?? null;
        return {
            email,
            name: email
                ? (row?.customer?.name ??
                  row?.guest_name ??
                  email.split('@')[0])
                : null,
            customer_id: row?.customer_id ?? null,
        };
    }

    private async notifyCancelled(order: {
        id: string;
        order_number: string;
        status: OrderStatus;
        is_cash: boolean;
        refund_pending: boolean;
    }): Promise<void> {
        const recipient = await this.resolveRecipient(order.id);
        if (!recipient.email || !recipient.name) {
            this.logger.warn(
                `No email for cancel notice on order ${order.id}`,
            );
        } else {
            await this.mailQueueService.enqueueSend({
                jobId: `cancel-order-${order.id}-cancelled`,
                to: recipient.email,
                subject: `Your order #${order.order_number} has been cancelled`,
                template: MAIL_TEMPLATES.CUSTOMER_ORDER_CANCELLED,
                context: {
                    name: recipient.name,
                    email: recipient.email,
                    order_number: order.order_number,
                    refund_pending: order.refund_pending,
                },
            });
        }

        if (recipient.customer_id) {
            await this.notificationPublisher.notifyCustomer(
                recipient.customer_id,
                {
                    title: 'Order cancelled',
                    type: NotificationType.ORDER,
                    text: `Your order #${order.order_number} has been cancelled.`,
                },
            );
        }
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
        if (!recipient.email || !recipient.name) {
            this.logger.warn(
                `No email for cancel-blocked notice on order ${order.id}`,
            );
        } else {
            await this.mailQueueService.enqueueSend({
                jobId: `cancel-order-${order.id}-blocked`,
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

        if (recipient.customer_id) {
            await this.notificationPublisher.notifyCustomer(
                recipient.customer_id,
                {
                    title: 'Cancellation unavailable',
                    type: NotificationType.ORDER,
                    text: `We could not cancel order #${order.order_number} because it is ${this.toStatusLabel(order.status)}.`,
                },
            );
        }
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
