import { Controller, Get, Query } from '@nestjs/common';
import {
    Auth,
    CurrentCustomer,
    CurrentStaff,
    ResponseMessage,
    type CustomerJwtPayload,
    type StaffJwtPayload,
} from '@app/common';
import { FindOrdersDto } from './dto/find-orders.dto.js';
import { FindStaffOrdersDto } from './dto/find-staff-orders.dto.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    @Get()
    @Auth('customer')
    @ResponseMessage('Orders retrieved successfully')
    findForCustomer(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Query() query: FindOrdersDto,
    ) {
        return this.ordersService.findForCustomer(customer.sub, query);
    }

    @Get('staff')
    @Auth('staff')
    @ResponseMessage('Orders retrieved successfully')
    findForStaff(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: FindStaffOrdersDto,
    ) {
        return this.ordersService.findForStaff(query, staff.market_ids);
    }
}
