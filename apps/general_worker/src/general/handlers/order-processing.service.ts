import { randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
    LogisticsLocationType,
    NotificationPublisher,
    NotificationType,
    OrderInventoryStatus,
    PrismaService,
    ShipmentStatus,
} from '@app/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
    GENERAL_JOBS,
    GeneralQueueService,
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
        private readonly generalQueueService: GeneralQueueService,
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
                guest_phone_number: true,
                shipping_address: true,
                warehouse_id: true,
                customer: {
                    select: { email: true, name: true },
                },
                warehouse: {
                    select: {
                        id: true,
                        name: true,
                        manager_id: true,
                        logistics_location: {
                            select: { id: true },
                        },
                    },
                },
                shipment: {
                    select: { id: true },
                },
                order_inventory: {
                    select: {
                        id: true,
                        status: true,
                        warehouse_id: true,
                        line_items: {
                            select: {
                                market_variant_id: true,
                                quantity: true,
                            },
                        },
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

        const inventory = order.order_inventory;
        if (!inventory) {
            this.logger.warn(
                `No order inventory for order ${order.id}; blocking order-processing`,
            );
            return;
        }

        if (inventory.status === OrderInventoryStatus.CLOSED) {
            await this.enqueueCancelForRefund(order.id);
            this.logger.warn(
                `Order inventory ${inventory.id} is CLOSED; enqueued cancel/refund for order ${order.id}`,
            );
            return;
        }

        if (inventory.status === OrderInventoryStatus.EXPIRED) {
            const reopened = await this.reReserveExpiredInventory(order);
            if (!reopened) {
                await this.enqueueCancelForRefund(order.id);
                this.logger.warn(
                    `Re-reserve failed for expired inventory ${inventory.id}; enqueued cancel for order ${order.id}`,
                );
                return;
            }
        } else {
            await this.completeOrderInventory(order);
        }

        await this.ensureGuestLogisticsLocation(order);

        const email = order.customer?.email ?? order.guest_email;
        if (!email) {
            this.logger.warn(
                `No email for order-processing notice on order ${order.id}`,
            );
        } else {
            const name =
                order.customer?.name ?? order.guest_name ?? email.split('@')[0];

            await this.mailQueueService.enqueueSend({
                jobId: `order-processing-${order.id}`,
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

        await this.createShipmentForOrder(order);
    }

    private async enqueueCancelForRefund(orderId: string): Promise<void> {
        await this.generalQueueService.enqueue(
            GENERAL_JOBS.CANCEL_ORDER,
            {
                order_id: orderId,
                actor: {
                    type: 'system',
                    source: 'inventory_blocked',
                },
            },
            { jobId: `cancel-order-inventory-blocked-${orderId}` },
        );
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

    private async reReserveExpiredInventory(order: {
        id: string;
        order_number: string;
        order_inventory: {
            id: string;
            status: OrderInventoryStatus;
            warehouse_id: string;
            line_items: { market_variant_id: string; quantity: number }[];
        } | null;
    }): Promise<boolean> {
        const inventory = order.order_inventory;
        if (!inventory || inventory.status !== OrderInventoryStatus.EXPIRED) {
            return false;
        }

        try {
            const outcome = await this.prisma.$transaction(async (tx) => {
                const claimed = await tx.orderInventory.updateManyAndReturn({
                    where: {
                        id: inventory.id,
                        status: OrderInventoryStatus.EXPIRED,
                    },
                    data: { status: OrderInventoryStatus.SUCCESS },
                    select: {
                        id: true,
                        warehouse_id: true,
                    },
                });

                if (claimed.length === 0) {
                    const current = await tx.orderInventory.findUnique({
                        where: { id: inventory.id },
                        select: { status: true },
                    });
                    if (current?.status === OrderInventoryStatus.SUCCESS) {
                        return 'already_success' as const;
                    }
                    return 'unavailable' as const;
                }

                const row = claimed[0];
                for (const line of inventory.line_items) {
                    const updated = await tx.inventory.updateManyAndReturn({
                        where: {
                            warehouse_id: row.warehouse_id,
                            market_variant_id: line.market_variant_id,
                            available_quantity: { gte: line.quantity },
                        },
                        data: {
                            available_quantity: { decrement: line.quantity },
                        },
                        select: {
                            available_quantity: true,
                        },
                    });

                    if (updated.length === 0) {
                        throw new Error(
                            `Insufficient available quantity for market variant ${line.market_variant_id} in warehouse ${row.warehouse_id}`,
                        );
                    }
                }

                return 'reopened' as const;
            });

            if (outcome === 'unavailable') {
                this.logger.warn(
                    `Expired inventory ${inventory.id} could not be reclaimed for order #${order.order_number}`,
                );
                return false;
            }

            this.logger.log(
                outcome === 'already_success'
                    ? `Expired inventory ${inventory.id} already SUCCESS for order #${order.order_number}`
                    : `Re-reserved expired inventory ${inventory.id} for order #${order.order_number}`,
            );
            return true;
        } catch (error) {
            this.logger.warn(
                `Failed to re-reserve expired inventory ${inventory.id} for order #${order.order_number}: ${error}`,
            );
            return false;
        }
    }

    private async createShipmentForOrder(order: {
        id: string;
        order_number: string;
        customer_id: string | null;
        guest_email: string | null;
        warehouse_id: string;
        warehouse: {
            id: string;
            name: string;
            logistics_location: { id: string } | null;
        } | null;
        shipment: { id: string } | null;
    }): Promise<void> {
        if (order.shipment) {
            this.logger.log(
                `Shipment ${order.shipment.id} already exists for order #${order.order_number}; skipping create`,
            );
            return;
        }

        const warehouseLocationId = order.warehouse?.logistics_location?.id;
        if (!warehouseLocationId) {
            throw new Error(
                `Warehouse ${order.warehouse_id} has no logistics location for order #${order.order_number}`,
            );
        }
        try {
            const shipment = await this.prisma.shipment.create({
                data: {
                    tracking_number: this.generateTrackingNumber(),
                    status: ShipmentStatus.PENDING,
                    origin_location: {
                        connect: { id: warehouseLocationId },
                    },
                    current_location: {
                        connect: { id: warehouseLocationId },
                    },
                    order: {
                        connect: { id: order.id },
                    },
                },
                select: { id: true, tracking_number: true },
            });

            this.logger.log(
                `Created shipment ${shipment.id} (${shipment.tracking_number}) for order #${order.order_number} at warehouse ${order.warehouse_id}`,
            );
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                this.logger.log(
                    `Shipment already exists for order #${order.order_number}; skipping create`,
                );
                return;
            }
            throw error;
        }
    }

    private async ensureGuestLogisticsLocation(order: {
        id: string;
        order_number: string;
        customer_id: string | null;
        guest_email: string | null;
        guest_name: string | null;
        guest_phone_number: string | null;
        shipping_address: unknown;
    }): Promise<void> {
        if (order.customer_id !== null) {
            return;
        }

        const email = this.asNonEmptyString(order.guest_email);
        if (!email) {
            this.logger.warn(
                `Guest order ${order.id} has no guest_email; skipping logistics location`,
            );
            return;
        }

        const existing = await this.prisma.logisticsLocation.findFirst({
            where: {
                type: LogisticsLocationType.CUSTOMER,
                email: {
                    equals: email,
                    mode: 'insensitive',
                },
            },
            select: { id: true },
        });

        if (existing) {
            this.logger.log(
                `Reusing logistics location ${existing.id} for guest order #${order.order_number}`,
            );
            return;
        }

        const address = this.parseShippingAddress(order.shipping_address);
        const name =
            address?.name ??
            this.asNonEmptyString(order.guest_name) ??
            email.split('@')[0]!;
        const phone =
            address?.phone_number ??
            this.asNonEmptyString(order.guest_phone_number);

        const created = await this.prisma.logisticsLocation.create({
            data: {
                type: LogisticsLocationType.CUSTOMER,
                name,
                email,
                phone,
                address: address?.street_address ?? null,
                state: address?.state ?? null,
                country: address?.country ?? null,
            },
            select: { id: true },
        });

        this.logger.log(
            `Created logistics location ${created.id} for guest order #${order.order_number}`,
        );
    }

    private generateTrackingNumber(): string {
        const timestamp = Date.now().toString(36).toUpperCase();
        const suffix = randomBytes(3).toString('hex').toUpperCase();
        return `SHP-${timestamp}-${suffix}`;
    }

    private parseShippingAddress(value: unknown): {
        name: string | null;
        phone_number: string | null;
        street_address: string | null;
        state: string | null;
        country: string | null;
    } | null {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }

        const raw = value as Record<string, unknown>;
        const firstName = this.asNonEmptyString(raw.first_name);
        const lastName = this.asNonEmptyString(raw.last_name);
        const fullName = this.asNonEmptyString(raw.name);

        let name: string | null = fullName;
        if (!name && firstName && lastName) {
            name = `${firstName} ${lastName}`;
        } else if (!name && firstName) {
            name = firstName;
        }

        return {
            name,
            phone_number: this.asNonEmptyString(raw.phone_number),
            street_address: this.asNonEmptyString(raw.street_address),
            state: this.asNonEmptyString(raw.state),
            country: this.asNonEmptyString(raw.country),
        };
    }

    private asNonEmptyString(value: unknown): string | null {
        if (typeof value !== 'string') {
            return null;
        }
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
}
