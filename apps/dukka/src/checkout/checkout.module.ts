import { Module } from '@nestjs/common';
import { AddressModule } from '../address/address.module.js';
import { CartModule } from '../cart/cart.module.js';
import { CustomerModule } from '../customer/customer.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { PointsModule } from '../points/points.module.js';
import { CheckoutController } from './checkout.controller.js';
import { CheckoutService } from './checkout.service.js';

@Module({
    imports: [
        AddressModule,
        CartModule,
        PointsModule,
        CustomerModule,
        PaymentsModule,
    ],
    controllers: [CheckoutController],
    providers: [CheckoutService],
})
export class CheckoutModule {}
