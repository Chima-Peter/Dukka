import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller.js';
import { PromotionsRepository } from './promotions.repository.js';
import { PromotionsService } from './promotions.service.js';

@Module({
    controllers: [PromotionsController],
    providers: [PromotionsService, PromotionsRepository],
    exports: [PromotionsService],
})
export class PromotionsModule {}
