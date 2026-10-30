import { Module } from '@nestjs/common';
import { AddressModule } from '../address/address.module.js';
import { CartModule } from '../cart/cart.module.js';
import { PointsModule } from '../points/points.module.js';
import { CheckoutController } from './checkout.controller.js';
import { CheckoutService } from './checkout.service.js';

@Module({
    imports: [AddressModule, CartModule, PointsModule],
    controllers: [CheckoutController],
    providers: [CheckoutService],
})
export class CheckoutModule {}
