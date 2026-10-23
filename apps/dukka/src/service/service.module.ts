import { Module, forwardRef } from '@nestjs/common';
import { CustomerModule } from '../customer/customer.module.js';
import { MarketsModule } from '../markets/markets.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { ServiceCountryController } from './service-country.controller.js';
import { ServiceCountryRepository } from './service-country.repository.js';
import { ServiceCountryService } from './service-country.service.js';
import { ServiceStateController } from './service-state.controller.js';
import { ServiceStateRepository } from './service-state.repository.js';
import { ServiceStateService } from './service-state.service.js';

@Module({
    imports: [
        MarketsModule,
        forwardRef(() => CustomerModule),
        forwardRef(() => WarehouseModule),
    ],
    controllers: [ServiceCountryController, ServiceStateController],
    providers: [
        ServiceCountryService,
        ServiceCountryRepository,
        ServiceStateService,
        ServiceStateRepository,
    ],
    exports: [ServiceCountryService, ServiceStateService],
})
export class ServiceModule {}
