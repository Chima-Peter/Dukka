import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
    NotificationPublisher,
    NotificationType,
    Prisma,
    PrismaService,
} from '@app/common';
import {
    MailQueueService,
    type InventoryStockReminderJobPayload,
    type InventoryStockReminderKind,
} from '@app/queues';

const quantityFilter = (
    kind: InventoryStockReminderKind,
): Prisma.IntFilter =>
    kind === 'finished'
        ? { equals: 0 }
        : { gt: 0, lte: 10 };

const inventoryBatchFingerprint = (inventoryIds: string[]): string =>
    createHash('sha256')
        .update([...inventoryIds].sort().join(','))
        .digest('hex')
        .slice(0, 16);

@Injectable()
export class InventoryStockReminderService {
    private readonly logger = new Logger(InventoryStockReminderService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mailQueueService: MailQueueService,
        private readonly notificationPublisher: NotificationPublisher,
    ) {}

    async process(payload: InventoryStockReminderJobPayload): Promise<void> {
        const { warehouse_id, kind } = payload;

        this.logger.log(
            `Collecting unsent ${kind} stock reminders for warehouse ${warehouse_id}`,
        );

        const inventories = await this.prisma.inventory.findMany({
            where: {
                warehouse_id: warehouse_id,
                available_quantity: quantityFilter(kind),
                ...(kind === 'finished'
                    ? {
                          finished_reminder_sent: false,
                          finished_reminder_sent_at: null,
                      }
                    : {
                          low_stock_reminder_sent: false,
                          low_stock_reminder_sent_at: null,
                      }),
            },
            select: {
                id: true,
                market_variant_id: true,
                warehouse: {
                    select: {
                        id: true,
                        name: true,
                        manager: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                market_variant: {
                    select: {
                        variant: {
                            select: {
                                product: {
                                    select: { name: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (inventories.length === 0) {
            this.logger.log(
                `No pending ${kind} stock reminders for warehouse ${warehouse_id}`,
            );
            return;
        }

        const warehouse = inventories[0].warehouse;
        if (!warehouse) {
            this.logger.warn(`Warehouse not found; skipping`);
            return;
        }

        const product_names = inventories.map(
            (row) => row.market_variant.variant.product.name,
        );
        const inventory_ids = inventories.map((row) => row.id);

        if (kind === 'finished') {
            const marketVariantIds = [
                ...new Set(inventories.map((row) => row.market_variant_id)),
            ];
            const soldOut = await this.prisma.marketVariant.updateMany({
                where: {
                    id: { in: marketVariantIds },
                    sold_out: false,
                    inventories: {
                        every: { available_quantity: 0 },
                    },
                },
                data: { sold_out: true },
            });
            this.logger.log(
                `Marked ${soldOut.count} market variant(s) sold out for warehouse ${warehouse_id}`,
            );
        }

        await this.mailQueueService.enqueueInventoryStockReminder({
            jobId: `inventory-stock-reminder-${warehouse_id}-${kind}-${inventoryBatchFingerprint(inventory_ids)}`,
            to: warehouse.manager.email,
            manager_name: warehouse.manager.name,
            warehouse_id: warehouse.id,
            warehouse_name: warehouse.name,
            inventory_ids,
            product_names,
            kind,
        });

        const kindLabel = kind === 'finished' ? 'out of stock' : 'low stock';
        await this.notificationPublisher.notifyStaff(warehouse.manager.id, {
            title: kind === 'finished' ? 'Stock depleted' : 'Low stock',
            type: NotificationType.SYSTEM,
            text: `${product_names.length} product(s) at ${warehouse.name} are ${kindLabel}.`,
        });

        this.logger.log(
            `Enqueued ${kind} stock reminder mail for warehouse ${warehouse_id} (${product_names.length} product(s))`,
        );
    }
}
