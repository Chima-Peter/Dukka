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
import { toScopedAccessActor } from '../shared/access-control.js';
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
    @RequirePermission(StaffPermission.CouponsManage)
    @ResponseMessage('Coupon created successfully')
    create(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: CreateCouponDto,
    ) {
        return this.couponsService.create(data, toScopedAccessActor(staff));
    }

    @Get()
    @RequirePermission(StaffPermission.CouponsRead)
    @ResponseMessage('Coupons retrieved successfully')
    findAll(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: FindCouponsDto,
    ) {
        return this.couponsService.findAll(query, toScopedAccessActor(staff));
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
    @RequirePermission(StaffPermission.CouponsManage)
    @ResponseMessage('Coupon updated successfully')
    update(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateCouponDto,
    ) {
        return this.couponsService.update(
            id,
            data,
            toScopedAccessActor(staff),
        );
    }

    @Post(':id/activate')
    @RequirePermission(StaffPermission.CouponsReview)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Coupon activated successfully')
    activate(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.couponsService.activate(id, toScopedAccessActor(staff));
    }

    @Post(':id/deactivate')
    @RequirePermission(StaffPermission.CouponsReview)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Coupon deactivated successfully')
    deactivate(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.couponsService.deactivate(id, toScopedAccessActor(staff));
    }
}
