import { Module } from '@nestjs/common';
import { ServiceModule } from '../service/service.module.js';
import { CustomerModule } from '../customer/customer.module.js';
import { ProductModule } from '../product/product.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryRepository } from './inventory.repository.js';
import { InventoryService } from './inventory.service.js';

@Module({
    imports: [
        ProductModule,
        WarehouseModule,
        CustomerModule,
        ServiceModule,
    ],
    controllers: [InventoryController],
    providers: [InventoryService, InventoryRepository],
    exports: [InventoryService],
})
export class InventoryModule {}
