import { Module } from '@nestjs/common';
import { HttpClientModule } from '@nestjs/http-client';
import { ScheduleModule } from '@nestjs/schedule';
import {
    NotificationPublisherModule,
    RestCountriesIpService,
} from '@app/common';
import { PaystackModule } from '../paystack/index.js';
import { GeneralProcessor } from './general.processor.js';
import { GeneralScheduler } from './general.scheduler.js';
import { CancelOrderService } from './handlers/cancel-order.service.js';
import { CustomerAccountDeletedService } from './handlers/customer-account-deleted.service.js';
import { CustomerRegisteredService } from './handlers/customer-registered.service.js';
import { ExpireCouponService } from './handlers/expire-coupon.service.js';
import { ExpirePromotionMarketService } from './handlers/expire-promotion-market.service.js';
import { ExpireStaffInvitationService } from './handlers/expire-staff-invitation.service.js';
import { ExpiredReservationsService } from './handlers/expired-reservations.service.js';
import { InventoryStockReminderService } from './handlers/inventory-stock-reminder.service.js';
import { MarketDeletedService } from './handlers/market-deleted.service.js';
import { OrderAwaitingPaymentService } from './handlers/order-awaiting-payment.service.js';
import { OrderCompletionService } from './handlers/order-completion.service.js';
import { OrderProcessingService } from './handlers/order-processing.service.js';
import { OrderShippedService } from './handlers/order-shipped.service.js';
import { ReviewReminderService } from './handlers/review-reminder.service.js';
import { StaffDeactivatedService } from './handlers/staff-deactivated.service.js';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        NotificationPublisherModule,
        PaystackModule,
        HttpClientModule.register({
            timeout: 5000,
        }),
    ],
    providers: [
        RestCountriesIpService,
        ExpiredReservationsService,
        CancelOrderService,
        OrderProcessingService,
        OrderShippedService,
        OrderAwaitingPaymentService,
        OrderCompletionService,
        CustomerRegisteredService,
        InventoryStockReminderService,
        CustomerAccountDeletedService,
        StaffDeactivatedService,
        MarketDeletedService,
        ExpirePromotionMarketService,
        ExpireCouponService,
        ExpireStaffInvitationService,
        ReviewReminderService,
        GeneralProcessor,
        GeneralScheduler,
    ],
})
export class GeneralModule {}
