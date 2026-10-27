import { Module } from '@nestjs/common';
import { HttpClientModule } from '@nestjs/http-client';
import { RestCountriesIpService } from '@app/common';
import { GeneralProcessor } from './general.processor.js';
import { CancelOrderService } from './handlers/cancel-order.service.js';
import { CustomerAccountDeletedService } from './handlers/customer-account-deleted.service.js';
import { CustomerRegisteredService } from './handlers/customer-registered.service.js';
import { ExpiredReservationsService } from './handlers/expired-reservations.service.js';
import { InventoryStockReminderService } from './handlers/inventory-stock-reminder.service.js';
import { StaffDeactivatedService } from './handlers/staff-deactivated.service.js';

@Module({
    imports: [
        HttpClientModule.register({
            timeout: 5000,
        }),
    ],
    providers: [
        RestCountriesIpService,
        ExpiredReservationsService,
        CancelOrderService,
        CustomerRegisteredService,
        InventoryStockReminderService,
        CustomerAccountDeletedService,
        StaffDeactivatedService,
        GeneralProcessor,
    ],
})
export class GeneralModule {}
