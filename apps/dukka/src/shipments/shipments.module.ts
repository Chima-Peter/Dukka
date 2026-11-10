import { Module } from '@nestjs/common';
import { ShipmentsController } from './shipments.controller.js';
import { ShipmentsRepository } from './shipments.repository.js';
import { ShipmentsService } from './shipments.service.js';

@Module({
    controllers: [ShipmentsController],
    providers: [ShipmentsService, ShipmentsRepository],
    exports: [ShipmentsService, ShipmentsRepository],
})
export class ShipmentsModule {}
