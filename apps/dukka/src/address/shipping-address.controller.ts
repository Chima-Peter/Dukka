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
    OptionalCustomerAuth,
    Public,
    ResponseMessage,
    type CustomerJwtPayload,
} from '@app/common';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';
import { ShippingAddressService } from './shipping-address.service.js';

@Controller('address/shipping')
export class ShippingAddressController {
    constructor(
        private readonly shippingAddressService: ShippingAddressService,
    ) {}

    @Post()
    @Public()
    @OptionalCustomerAuth()
    @ResponseMessage('Shipping address created successfully')
    create(
        @CurrentCustomer({ optional: true }) customer:
            | CustomerJwtPayload
            | undefined,
        @Body() data: CreateAddressDto,
    ) {
        return this.shippingAddressService.create(customer?.sub, data);
    }

    @Get()
    @Auth('customer')
    @ResponseMessage('Shipping addresses retrieved successfully')
    findAll(@CurrentCustomer() customer: CustomerJwtPayload) {
        return this.shippingAddressService.findAll(customer.sub);
    }

    @Get(':id')
    @Auth('customer')
    @ResponseMessage('Shipping address retrieved successfully')
    findOne(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.shippingAddressService.findOne(customer.sub, id);
    }

    @Patch(':id')
    @Auth('customer')
    @ResponseMessage('Shipping address updated successfully')
    update(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateAddressDto,
    ) {
        return this.shippingAddressService.update(customer.sub, id, data);
    }

    @Delete(':id')
    @Auth('customer')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Shipping address deleted successfully')
    delete(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.shippingAddressService.delete(customer.sub, id);
    }
}
