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
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';
import { BillingAddressService } from './billing-address.service.js';

@Auth('customer')
@Controller('address/billing')
export class BillingAddressController {
    constructor(
        private readonly billingAddressService: BillingAddressService,
    ) {}

    @Post()
    @ResponseMessage('Billing address created successfully')
    create(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Body() data: CreateAddressDto,
    ) {
        return this.billingAddressService.create(customer.sub, data);
    }

    @Get()
    @ResponseMessage('Billing addresses retrieved successfully')
    findAll(@CurrentCustomer() customer: CustomerJwtPayload) {
        return this.billingAddressService.findAll(customer.sub);
    }

    @Get(':id')
    @ResponseMessage('Billing address retrieved successfully')
    findOne(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.billingAddressService.findOne(customer.sub, id);
    }

    @Patch(':id')
    @ResponseMessage('Billing address updated successfully')
    update(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateAddressDto,
    ) {
        return this.billingAddressService.update(customer.sub, id, data);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Billing address deleted successfully')
    delete(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.billingAddressService.delete(customer.sub, id);
    }
}
