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
import { BillingAddressService } from './billing-address.service.js';

@Controller('address/billing')
export class BillingAddressController {
    constructor(
        private readonly billingAddressService: BillingAddressService,
    ) {}

    @Post()
    @Public()
    @OptionalCustomerAuth()
    @ResponseMessage('Billing address created successfully')
    create(
        @CurrentCustomer({ optional: true }) customer:
            | CustomerJwtPayload
            | undefined,
        @Body() data: CreateAddressDto,
    ) {
        return this.billingAddressService.create(customer?.sub, data);
    }

    @Get()
    @Auth('customer')
    @ResponseMessage('Billing addresses retrieved successfully')
    findAll(@CurrentCustomer() customer: CustomerJwtPayload) {
        return this.billingAddressService.findAll(customer.sub);
    }

    @Get(':id')
    @Auth('customer')
    @ResponseMessage('Billing address retrieved successfully')
    findOne(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.billingAddressService.findOne(customer.sub, id);
    }

    @Patch(':id')
    @Auth('customer')
    @ResponseMessage('Billing address updated successfully')
    update(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateAddressDto,
    ) {
        return this.billingAddressService.update(customer.sub, id, data);
    }

    @Delete(':id')
    @Auth('customer')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Billing address deleted successfully')
    delete(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.billingAddressService.delete(customer.sub, id);
    }
}
