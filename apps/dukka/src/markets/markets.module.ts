import { Module } from '@nestjs/common';
import { HttpClientModule } from '@nestjs/http-client';
import { NotificationPublisherModule, RestCountriesIpService } from '@app/common';
import { MarketsController } from './markets.controller.js';
import { MarketsRepository } from './markets.repository.js';
import { MarketsService } from './markets.service.js';

@Module({
    imports: [
        NotificationPublisherModule,
        HttpClientModule.register({
            timeout: 5000,
        }),
    ],
    controllers: [MarketsController],
    providers: [MarketsService, MarketsRepository, RestCountriesIpService],
    exports: [MarketsService],
})
export class MarketsModule {}
