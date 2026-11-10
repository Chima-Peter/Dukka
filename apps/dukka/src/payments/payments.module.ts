import { Module } from '@nestjs/common';
import { HttpClientModule } from '@nestjs/http-client';
import { NotificationPublisherModule } from '@app/common';
import { MarketsModule } from '../markets/markets.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsRepository } from './payments.repository.js';
import { PaymentsService } from './payments.service.js';
import { PaystackService } from './providers/index.js';

@Module({
    imports: [
        MarketsModule,
        OrdersModule,
        NotificationPublisherModule,
        HttpClientModule.register(),
    ],
    controllers: [PaymentsController],
    providers: [PaymentsService, PaymentsRepository, PaystackService],
    exports: [PaymentsService, PaymentsRepository, PaystackService],
})
export class PaymentsModule {}
