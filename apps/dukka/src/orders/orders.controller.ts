import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
} from '@nestjs/common';
import {
    Auth,
    CurrentCustomer,
    CurrentStaff,
    ResponseMessage,
    type CustomerJwtPayload,
    type StaffJwtPayload,
} from '@app/common';
import { FindOrdersDto } from './dto/find-orders.dto.js';
import { FindStaffOrderDto } from './dto/find-staff-order.dto.js';
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

    @Get('internal')
    @Auth('staff')
    @ResponseMessage('Orders retrieved successfully')
    findForStaff(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: FindStaffOrdersDto,
    ) {
        return this.ordersService.findForStaff(query, staff.market_ids);
    }

    @Get('internal/:id')
    @Auth('staff')
    @ResponseMessage('Order retrieved successfully')
    findOneForStaff(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: FindStaffOrderDto,
    ) {
        return this.ordersService.findOneForStaff(
            id,
            query.market_id,
            staff.market_ids,
        );
    }

    @Get(':id')
    @Auth('customer')
    @ResponseMessage('Order retrieved successfully')
    findOneForCustomer(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.ordersService.findOneForCustomer(customer.sub, id);
    }

    @Post(':id/cancel')
    @Auth('customer')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Order cancelled successfully')
    cancelForCustomer(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.ordersService.cancelForCustomer(customer.sub, id);
    }
}
