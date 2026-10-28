import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/common';
import {
    MAIL_TEMPLATES,
    type InventoryStockReminderMailPayload,
} from '@app/queues';
import { MailService } from './mail.service.js';

@Injectable()
export class InventoryStockReminderMailService {
    private readonly logger = new Logger(
        InventoryStockReminderMailService.name,
    );

    constructor(
        private readonly mailService: MailService,
        private readonly prisma: PrismaService,
    ) {}

    async process(
        payload: InventoryStockReminderMailPayload,
        options?: { idempotencyKey?: string },
    ): Promise<void> {
        const {
            to,
            manager_name,
            warehouse_id,
            warehouse_name,
            inventory_ids,
            product_names,
            kind,
        } = payload;

        if (inventory_ids.length === 0 || product_names.length === 0) {
            this.logger.log(
                `No products to remind for warehouse ${warehouse_id}; skipping`,
            );
            return;
        }

        const isLowStock = kind === 'low';
        const subject = isLowStock
            ? `Low stock alert: ${warehouse_name}`
            : `Out of stock: ${warehouse_name}`;
        const template = isLowStock
            ? MAIL_TEMPLATES.INVENTORY_LOW_STOCK_REMINDER
            : MAIL_TEMPLATES.INVENTORY_STOCK_REMINDER;

        this.logger.log(
            `Sending ${kind} stock reminder to=${to} warehouse=${warehouse_id} products=${product_names.length}`,
        );

        await this.mailService.send(
            {
                to,
                subject,
                template,
                context: {
                    name: manager_name,
                    warehouseName: warehouse_name,
                    products: product_names,
                    productCount: product_names.length,
                },
            },
            options,
        );

        const now = new Date();
        const result = await this.prisma.inventory.updateMany({
            where: {
                id: { in: inventory_ids },
                warehouse_id,
                ...(isLowStock
                    ? {
                          low_stock_reminder_sent: false,
                          low_stock_reminder_sent_at: null,
                      }
                    : {
                          finished_reminder_sent: false,
                          finished_reminder_sent_at: null,
                      }),
            },
            data: isLowStock
                ? {
                      low_stock_reminder_sent: true,
                      low_stock_reminder_sent_at: now,
                  }
                : {
                      finished_reminder_sent: true,
                      finished_reminder_sent_at: now,
                  },
        });

        this.logger.log(
            `Marked ${kind} reminder on ${result.count} inventory row(s) for warehouse ${warehouse_id}`,
        );
    }
}
