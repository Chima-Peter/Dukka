import { Module } from '@nestjs/common';
import { GeneralProcessor } from './general.processor.js';
import { ExpiredReservationsService } from './handlers/expired-reservations.service.js';
import { OrderMatchingService } from './handlers/order-matching.service.js';

@Module({
    providers: [
        ExpiredReservationsService,
        OrderMatchingService,
        GeneralProcessor,
    ],
})
export class GeneralModule {}
