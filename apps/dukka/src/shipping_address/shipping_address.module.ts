import { Module } from '@nestjs/common';
import { ShippingAddressController } from './shipping_address.controller.js';
import { ShippingAddressRepository } from './shipping_address.repository.js';
import { ShippingAddressService } from './shipping_address.service.js';

@Module({
    controllers: [ShippingAddressController],
    providers: [ShippingAddressService, ShippingAddressRepository],
    exports: [ShippingAddressService],
})
export class ShippingAddressModule {}
