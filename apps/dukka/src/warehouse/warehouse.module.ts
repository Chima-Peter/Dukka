import { Module } from '@nestjs/common';
import { MarketsModule } from '../markets/markets.module.js';
import { WarehouseController } from './warehouse.controller.js';
import { WarehouseRepository } from './warehouse.repository.js';
import { WarehouseService } from './warehouse.service.js';
import { StaffModule } from '../staff/staff.module.js';

@Module({
    imports: [MarketsModule, StaffModule],
    controllers: [WarehouseController],
    providers: [WarehouseService, WarehouseRepository],
    exports: [WarehouseService, WarehouseRepository],
})
export class WarehouseModule {}
