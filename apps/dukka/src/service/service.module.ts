import { Module, forwardRef } from '@nestjs/common';
import { HttpClientModule } from '@nestjs/http-client';
import { RestCountriesIpService } from '@app/common';
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
        HttpClientModule.register({
            timeout: 5000,
        }),
        forwardRef(() => CustomerModule),
        forwardRef(() => WarehouseModule),
    ],
    controllers: [ServiceCountryController, ServiceStateController],
    providers: [
        ServiceCountryService,
        ServiceCountryRepository,
        ServiceStateService,
        ServiceStateRepository,
        RestCountriesIpService,
    ],
    exports: [ServiceCountryService, ServiceStateService],
})
export class ServiceModule {}
