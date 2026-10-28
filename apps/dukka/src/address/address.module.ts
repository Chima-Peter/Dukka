import { Module } from '@nestjs/common';
import { CustomerModule } from '../customer/customer.module.js';
import { BillingAddressController } from './billing-address.controller.js';
import { BillingAddressRepository } from './billing-address.repository.js';
import { BillingAddressService } from './billing-address.service.js';
import { ShippingAddressController } from './shipping-address.controller.js';
import { ShippingAddressRepository } from './shipping-address.repository.js';
import { ShippingAddressService } from './shipping-address.service.js';

@Module({
    imports: [CustomerModule],
    controllers: [ShippingAddressController, BillingAddressController],
    providers: [
        ShippingAddressService,
        ShippingAddressRepository,
        BillingAddressService,
        BillingAddressRepository,
    ],
    exports: [ShippingAddressService, BillingAddressService],
})
export class AddressModule {}
