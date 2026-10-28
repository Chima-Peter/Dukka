import { Module } from '@nestjs/common';
import { CouponsController } from './coupons.controller.js';
import { CouponsRepository } from './coupons.repository.js';
import { CouponsService } from './coupons.service.js';

@Module({
    controllers: [CouponsController],
    providers: [CouponsService, CouponsRepository],
    exports: [CouponsService],
})
export class CouponsModule {}
