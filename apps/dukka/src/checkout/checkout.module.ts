import { Module } from '@nestjs/common';
import { AddressModule } from '../address/address.module.js';
import { CartModule } from '../cart/cart.module.js';
import { CustomerModule } from '../customer/customer.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { PointsModule } from '../points/points.module.js';
import { ServiceModule } from '../service/service.module.js';
import { CheckoutController } from './checkout.controller.js';
import { CheckoutRepository } from './checkout.repository.js';
import { CheckoutService } from './checkout.service.js';

@Module({
    imports: [
        AddressModule,
        CartModule,
        PointsModule,
        CustomerModule,
        PaymentsModule,
        OrdersModule,
        InventoryModule,
        ServiceModule,
    ],
    controllers: [CheckoutController],
    providers: [CheckoutService, CheckoutRepository],
})
export class CheckoutModule {}
