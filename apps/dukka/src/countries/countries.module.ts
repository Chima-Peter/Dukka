import { Module, forwardRef } from '@nestjs/common';
import { MarketsModule } from '../markets/markets.module.js';
import { CountriesController } from './countries.controller.js';
import { CountriesRepository } from './countries.repository.js';
import { CountriesService } from './countries.service.js';

@Module({
    imports: [forwardRef(() => MarketsModule)],
    controllers: [CountriesController],
    providers: [CountriesService, CountriesRepository],
    exports: [CountriesService],
})
export class CountriesModule {}
