import { Module } from '@nestjs/common';
import { LogisticsPartnersController } from './logistics-partners.controller.js';
import { LogisticsPartnersRepository } from './logistics-partners.repository.js';
import { LogisticsPartnersService } from './logistics-partners.service.js';

@Module({
    controllers: [LogisticsPartnersController],
    providers: [LogisticsPartnersService, LogisticsPartnersRepository],
    exports: [LogisticsPartnersService, LogisticsPartnersRepository],
})
export class LogisticsPartnersModule {}
