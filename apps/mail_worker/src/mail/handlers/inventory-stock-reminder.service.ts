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
        } = payload;

        if (inventory_ids.length === 0 || product_names.length === 0) {
            this.logger.log(
                `No products to remind for warehouse ${warehouse_id}; skipping`,
            );
            return;
        }

        this.logger.log(
            `Sending stock reminder to=${to} warehouse=${warehouse_id} products=${product_names.length}`,
        );

        await this.mailService.send(
            {
                to,
                subject: `Stock reminder: ${warehouse_name}`,
                template: MAIL_TEMPLATES.INVENTORY_STOCK_REMINDER,
                context: {
                    name: manager_name,
                    warehouseName: warehouse_name,
                    products: product_names,
                    productCount: product_names.length,
                },
            },
            options,
        );

        const result = await this.prisma.inventory.updateMany({
            where: {
                id: { in: inventory_ids },
                warehouse_id,
                reminder_sent: false,
                reminder_sent_at: null,
            },
            data: {
                reminder_sent: true,
                reminder_sent_at: new Date(),
            },
        });

        this.logger.log(
            `Marked reminder_sent on ${result.count} inventory row(s) for warehouse ${warehouse_id}`,
        );
    }
}
