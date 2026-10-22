import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
} from '@nestjs/common';
import {
    Auth,
    CurrentCustomer,
    ResponseMessage,
    type CustomerJwtPayload,
} from '@app/common';
import { CreateShippingAddressDto } from './dto/create-shipping-address.dto.js';
import { UpdateShippingAddressDto } from './dto/update-shipping-address.dto.js';
import { ShippingAddressService } from './shipping_address.service.js';

@Auth('customer')
@Controller('shipping-address')
export class ShippingAddressController {
    constructor(
        private readonly shippingAddressService: ShippingAddressService,
    ) {}

    @Post()
    @ResponseMessage('Shipping address created successfully')
    create(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Body() data: CreateShippingAddressDto,
    ) {
        return this.shippingAddressService.create(customer.sub, data);
    }

    @Get()
    @ResponseMessage('Shipping addresses retrieved successfully')
    findAll(@CurrentCustomer() customer: CustomerJwtPayload) {
        return this.shippingAddressService.findAll(customer.sub);
    }

    @Get(':id')
    @ResponseMessage('Shipping address retrieved successfully')
    findOne(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.shippingAddressService.findOne(customer.sub, id);
    }

    @Patch(':id')
    @ResponseMessage('Shipping address updated successfully')
    update(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateShippingAddressDto,
    ) {
        return this.shippingAddressService.update(customer.sub, id, data);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Shipping address deleted successfully')
    delete(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.shippingAddressService.delete(customer.sub, id);
    }
}
