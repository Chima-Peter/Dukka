import { Module } from '@nestjs/common';
import { GeneralProcessor } from './general.processor.js';
import { ExpiredReservationsService } from './handlers/expired-reservations.service.js';

@Module({
    providers: [ExpiredReservationsService, GeneralProcessor],
})
export class GeneralModule {}
