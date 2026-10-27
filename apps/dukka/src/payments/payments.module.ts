import { Module } from '@nestjs/common';
import { MarketsModule } from '../markets/markets.module.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsRepository } from './payments.repository.js';
import { PaymentsService } from './payments.service.js';

@Module({
    imports: [MarketsModule],
    controllers: [PaymentsController],
    providers: [PaymentsService, PaymentsRepository],
    exports: [PaymentsService],
})
export class PaymentsModule {}
