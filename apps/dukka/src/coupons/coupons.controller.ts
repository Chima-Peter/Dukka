import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import {
    Auth,
    CurrentStaff,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
    type StaffJwtPayload,
} from '@app/common';
import { CreateCouponDto } from './dto/create-coupon.dto.js';
import { FindCouponUsagesDto } from './dto/find-coupon-usages.dto.js';
import { FindCouponsDto } from './dto/find-coupons.dto.js';
import { UpdateCouponDto } from './dto/update-coupon.dto.js';
import { CouponsService } from './coupons.service.js';

@Auth('staff')
@Controller('coupons')
export class CouponsController {
    constructor(private readonly couponsService: CouponsService) {}

    @Post()
    @RequirePermission(StaffPermission.CouponsCreate)
    @ResponseMessage('Coupon created successfully')
    create(@Body() data: CreateCouponDto) {
        return this.couponsService.create(data);
    }

    @Get()
    @RequirePermission(StaffPermission.CouponsRead)
    @ResponseMessage('Coupons retrieved successfully')
    findAll(@Query() query: FindCouponsDto) {
        return this.couponsService.findAll(query);
    }

    @Get('usages')
    @RequirePermission(StaffPermission.CouponsRead)
    @ResponseMessage('Coupon usages retrieved successfully')
    findUsages(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: FindCouponUsagesDto,
    ) {
        return this.couponsService.findUsages(query, staff.market_ids);
    }

    @Patch(':id')
    @RequirePermission(StaffPermission.CouponsUpdate)
    @ResponseMessage('Coupon updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateCouponDto,
    ) {
        return this.couponsService.update(id, data);
    }

    @Post(':id/activate')
    @RequirePermission(StaffPermission.CouponsActivate)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Coupon activated successfully')
    activate(@Param('id', ParseUUIDPipe) id: string) {
        return this.couponsService.activate(id);
    }

    @Post(':id/deactivate')
    @RequirePermission(StaffPermission.CouponsDeactivate)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Coupon deactivated successfully')
    deactivate(@Param('id', ParseUUIDPipe) id: string) {
        return this.couponsService.deactivate(id);
    }
}
