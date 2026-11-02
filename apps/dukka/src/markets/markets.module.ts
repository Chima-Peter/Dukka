import { Module } from '@nestjs/common';
import { NotificationPublisherModule } from '@app/common';
import { MarketsController } from './markets.controller.js';
import { MarketsRepository } from './markets.repository.js';
import { MarketsService } from './markets.service.js';

@Module({
    imports: [NotificationPublisherModule],
    controllers: [MarketsController],
    providers: [MarketsService, MarketsRepository],
    exports: [MarketsService],
})
export class MarketsModule {}
