import { Module } from '@nestjs/common';
import { NotificationPublisherModule } from '@app/common';
import { ServiceModule } from '../service/service.module.js';
import { StaffModule } from '../staff/staff.module.js';
import { DistributionPointsController } from './distribution-points.controller.js';
import { DistributionPointsRepository } from './distribution-points.repository.js';
import { DistributionPointsService } from './distribution-points.service.js';

@Module({
    imports: [
        StaffModule,
        ServiceModule,
        NotificationPublisherModule,
    ],
    controllers: [DistributionPointsController],
    providers: [DistributionPointsService, DistributionPointsRepository],
    exports: [DistributionPointsService, DistributionPointsRepository],
})
export class DistributionPointsModule {}
