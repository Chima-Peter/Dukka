import { Module } from '@nestjs/common';
import { HttpClientModule } from '@nestjs/http-client';
import { MarketsModule } from '../markets/markets.module.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsRepository } from './payments.repository.js';
import { PaymentsService } from './payments.service.js';
import { PaystackService } from './providers/index.js';

@Module({
    imports: [
        MarketsModule,
        HttpClientModule.register(),
    ],
    controllers: [PaymentsController],
    providers: [PaymentsService, PaymentsRepository, PaystackService],
    exports: [PaymentsService, PaystackService],
})
export class PaymentsModule {}
