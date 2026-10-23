import { Module, forwardRef } from '@nestjs/common';
import { CustomerModule } from '../customer/customer.module.js';
import { MarketsModule } from '../markets/markets.module.js';
import { CountriesController } from './countries.controller.js';
import { CountriesRepository } from './countries.repository.js';
import { CountriesService } from './countries.service.js';

@Module({
    imports: [forwardRef(() => MarketsModule), CustomerModule],
    controllers: [CountriesController],
    providers: [CountriesService, CountriesRepository],
    exports: [CountriesService],
})
export class CountriesModule {}
