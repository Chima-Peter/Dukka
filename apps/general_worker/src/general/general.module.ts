import { Module } from '@nestjs/common';
import { GeneralProcessor } from './general.processor.js';
import { CancelOrderService } from './handlers/cancel-order.service.js';
import { CustomerAccountDeletedService } from './handlers/customer-account-deleted.service.js';
import { ExpiredReservationsService } from './handlers/expired-reservations.service.js';
import { InventoryStockReminderService } from './handlers/inventory-stock-reminder.service.js';
import { OrderMatchingService } from './handlers/order-matching.service.js';

@Module({
    providers: [
        ExpiredReservationsService,
        CancelOrderService,
        OrderMatchingService,
        InventoryStockReminderService,
        CustomerAccountDeletedService,
        GeneralProcessor,
    ],
})
export class GeneralModule {}
