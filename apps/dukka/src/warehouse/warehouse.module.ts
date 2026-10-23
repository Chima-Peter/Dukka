import { Module } from '@nestjs/common';
import { CountriesModule } from '../countries/countries.module.js';
import { CustomerModule } from '../customer/customer.module.js';
import { StaffModule } from '../staff/staff.module.js';
import { ServiceStateController } from './service-state.controller.js';
import { ServiceStateRepository } from './service-state.repository.js';
import { ServiceStateService } from './service-state.service.js';
import { WarehouseController } from './warehouse.controller.js';
import { WarehouseRepository } from './warehouse.repository.js';
import { WarehouseService } from './warehouse.service.js';

@Module({
    imports: [StaffModule, CountriesModule, CustomerModule],
    controllers: [WarehouseController, ServiceStateController],
    providers: [
        WarehouseService,
        WarehouseRepository,
        ServiceStateService,
        ServiceStateRepository,
    ],
    exports: [WarehouseService, WarehouseRepository, ServiceStateService],
})
export class WarehouseModule {}
