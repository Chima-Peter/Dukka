import { Module } from '@nestjs/common';
import { NotificationPublisherModule } from '@app/common';
import { PointsController } from './points.controller.js';
import { PointsRepository } from './points.repository.js';
import { PointsService } from './points.service.js';

@Module({
    imports: [NotificationPublisherModule],
    controllers: [PointsController],
    providers: [PointsService, PointsRepository],
    exports: [PointsService, PointsRepository],
})
export class PointsModule {}
