import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
    Auth,
    CurrentCustomer,
    ResponseMessage,
    type CustomerJwtPayload,
} from '@app/common';
import { CreatePointsHistoryDto } from './dto/create-points-history.dto.js';
import { FindPointsHistoryDto } from './dto/find-points-history.dto.js';
import { PointsService } from './points.service.js';

@Auth('customer')
@Controller('points')
export class PointsController {
    constructor(private readonly pointsService: PointsService) {}

    @Get('history')
    @ResponseMessage('Points history retrieved successfully')
    findHistory(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Query() query: FindPointsHistoryDto,
    ) {
        return this.pointsService.findHistory(customer.sub, query);
    }

    @Post('earn')
    @ResponseMessage('Points earned successfully')
    earn(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Body() data: CreatePointsHistoryDto,
    ) {
        return this.pointsService.earn(customer.sub, data);
    }

    @Post('redeem')
    @ResponseMessage('Points redeemed successfully')
    redeem(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Body() data: CreatePointsHistoryDto,
    ) {
        return this.pointsService.redeem(customer.sub, data);
    }
}
