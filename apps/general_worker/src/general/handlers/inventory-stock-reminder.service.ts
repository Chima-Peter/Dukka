import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaService } from '@app/common';
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

@Injectable()
export class InventoryStockReminderService {
    private readonly logger = new Logger(InventoryStockReminderService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mailQueueService: MailQueueService,
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
                warehouse: {
                    select: {
                        id: true,
                        name: true,
                        manager: {
                            select: {
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

        await this.mailQueueService.enqueueInventoryStockReminder({
            to: warehouse.manager.email,
            manager_name: warehouse.manager.name,
            warehouse_id: warehouse.id,
            warehouse_name: warehouse.name,
            inventory_ids,
            product_names,
            kind,
        });

        this.logger.log(
            `Enqueued ${kind} stock reminder mail for warehouse ${warehouse_id} (${product_names.length} product(s))`,
        );
    }
}
