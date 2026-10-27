import { Module } from '@nestjs/common';
import { ExpiredReservationsService } from './expired-reservations.service.js';
import { GeneralProcessor } from './general.processor.js';

@Module({
    providers: [ExpiredReservationsService, GeneralProcessor],
})
export class GeneralModule {}
