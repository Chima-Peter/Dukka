import { Module } from '@nestjs/common';
import { NotificationPublisherModule } from '@app/common';
import { ShipmentsController } from './shipments.controller.js';
import { ShipmentsRepository } from './shipments.repository.js';
import { ShipmentsService } from './shipments.service.js';

@Module({
    imports: [NotificationPublisherModule],
    controllers: [ShipmentsController],
    providers: [ShipmentsService, ShipmentsRepository],
    exports: [ShipmentsService, ShipmentsRepository],
})
export class ShipmentsModule {}
