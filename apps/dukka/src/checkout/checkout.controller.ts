import { Controller, Get, Query } from '@nestjs/common';
import {
    CurrentCustomer,
    OptionalCustomerAuth,
    Public,
    ResponseMessage,
    type CustomerJwtPayload,
} from '@app/common';
import { CheckoutService } from './checkout.service.js';
import { PrecheckoutQueryDto } from './dto/precheckout-query.dto.js';

@Controller('checkout')
export class CheckoutController {
    constructor(private readonly checkoutService: CheckoutService) {}

    @Get('precheckout')
    @Public()
    @OptionalCustomerAuth()
    @ResponseMessage('Precheckout data retrieved successfully')
    getPrecheckout(
        @CurrentCustomer({ optional: true }) customer:
            | CustomerJwtPayload
            | undefined,
        @Query() query: PrecheckoutQueryDto,
    ) {
        return this.checkoutService.getPrecheckout(customer, query.cart_id);
    }
}
