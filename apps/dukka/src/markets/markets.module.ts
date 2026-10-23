import { Module, forwardRef } from '@nestjs/common';
import { CountriesModule } from '../countries/countries.module.js';
import { MarketsController } from './markets.controller.js';
import { MarketsRepository } from './markets.repository.js';
import { MarketsService } from './markets.service.js';

@Module({
    imports: [forwardRef(() => CountriesModule)],
    controllers: [MarketsController],
    providers: [MarketsService, MarketsRepository],
    exports: [MarketsService],
})
export class MarketsModule {}
