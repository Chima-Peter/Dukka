import { Module } from '@nestjs/common';
import { WarehouseController } from './warehouse.controller.js';
import { WarehouseRepository } from './warehouse.repository.js';
import { WarehouseService } from './warehouse.service.js';

@Module({
    controllers: [WarehouseController],
    providers: [WarehouseService, WarehouseRepository],
    exports: [WarehouseService, WarehouseRepository],
})
export class WarehouseModule {}
