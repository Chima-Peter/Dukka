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
import { AddPromotionMarketDto } from './dto/add-promotion-market.dto.js';
import { CreateDiscountDto } from './dto/create-discount.dto.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { FindPromotionMarketTargetsDto } from './dto/find-promotion-market-targets.dto.js';
import { FindPromotionUsagesDto } from './dto/find-promotion-usages.dto.js';
import { FindPromotionsDto } from './dto/find-promotions.dto.js';
import { PromotionMarketVariantsDto } from './dto/promotion-market-variants.dto.js';
import { UpdateDiscountDto } from './dto/update-discount.dto.js';
import { UpdatePromotionDto } from './dto/update-promotion.dto.js';
import { UpdatePromotionMarketDto } from './dto/update-promotion-market.dto.js';
import { PromotionsService } from './promotions.service.js';

@Auth('staff')
@Controller('promotions')
export class PromotionsController {
    constructor(private readonly promotionsService: PromotionsService) {}

    @Post()
    @RequirePermission(StaffPermission.PromotionsManage)
    @ResponseMessage('Promotion created successfully')
    create(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: CreatePromotionDto,
    ) {
        return this.promotionsService.create(
            data,
            toScopedAccessActor(staff),
        );
    }

    @Get()
    @RequirePermission(StaffPermission.PromotionsRead)
    @ResponseMessage('Promotions retrieved successfully')
    findAll(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: FindPromotionsDto,
    ) {
        return this.promotionsService.findAll(query, staff.market_ids);
    }

    @Get('usages')
    @RequirePermission(StaffPermission.PromotionsRead)
    @ResponseMessage('Promotion usages retrieved successfully')
    findUsages(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: FindPromotionUsagesDto,
    ) {
        return this.promotionsService.findUsages(query, staff.market_ids);
    }

    @Get('discounts')
    @RequirePermission(StaffPermission.PromotionsRead)
    @ResponseMessage('Discounts retrieved successfully')
    findAllDiscounts(@CurrentStaff() staff: StaffJwtPayload) {
        return this.promotionsService.findAllDiscounts(
            toScopedAccessActor(staff),
        );
    }

    @Post('discounts')
    @RequirePermission(StaffPermission.PromotionsManage)
    @ResponseMessage('Discount created successfully')
    createDiscount(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: CreateDiscountDto,
    ) {
        return this.promotionsService.createDiscount(
            data,
            toScopedAccessActor(staff),
        );
    }

    @Get('discounts/:id')
    @RequirePermission(StaffPermission.PromotionsRead)
    @ResponseMessage('Discount retrieved successfully')
    findOneDiscount(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.promotionsService.findOneDiscount(
            id,
            toScopedAccessActor(staff),
        );
    }

    @Patch('discounts/:id')
    @RequirePermission(StaffPermission.PromotionsManage)
    @ResponseMessage('Discount updated successfully')
    updateDiscount(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateDiscountDto,
    ) {
        return this.promotionsService.updateDiscount(
            id,
            data,
            toScopedAccessActor(staff),
        );
    }

    @Post(':id/markets')
    @RequirePermission(StaffPermission.PromotionsManage)
    @ResponseMessage('Promotion market added successfully')
    addMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: AddPromotionMarketDto,
    ) {
        return this.promotionsService.addMarket(id, data, staff.market_ids);
    }

    @Patch(':id/markets/:promotionMarketId')
    @RequirePermission(StaffPermission.PromotionsManage)
    @ResponseMessage('Promotion market updated successfully')
    updateMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('promotionMarketId', ParseUUIDPipe) promotionMarketId: string,
        @Body() data: UpdatePromotionMarketDto,
    ) {
        return this.promotionsService.updateMarket(
            id,
            promotionMarketId,
            data,
            staff.market_ids,
        );
    }

    @Post(':id/markets/:promotionMarketId/activate')
    @RequirePermission(StaffPermission.PromotionsReview)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Promotion market activated successfully')
    activateMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('promotionMarketId', ParseUUIDPipe) promotionMarketId: string,
    ) {
        return this.promotionsService.activateMarket(
            id,
            promotionMarketId,
            staff.market_ids,
        );
    }

    @Post(':id/markets/:promotionMarketId/deactivate')
    @RequirePermission(StaffPermission.PromotionsReview)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Promotion market deactivated successfully')
    deactivateMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('promotionMarketId', ParseUUIDPipe) promotionMarketId: string,
    ) {
        return this.promotionsService.deactivateMarket(
            id,
            promotionMarketId,
            staff.market_ids,
        );
    }

    @Post(':id/markets/:promotionMarketId/variants')
    @RequirePermission(StaffPermission.PromotionsManage)
    @ResponseMessage('Variants added to promotion market successfully')
    addVariants(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('promotionMarketId', ParseUUIDPipe) promotionMarketId: string,
        @Body() data: PromotionMarketVariantsDto,
    ) {
        return this.promotionsService.addVariants(
            id,
            promotionMarketId,
            data,
            staff.market_ids,
        );
    }

    @Delete(':id/markets/:promotionMarketId/variants')
    @RequirePermission(StaffPermission.PromotionsManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Variants removed from promotion market successfully')
    removeVariants(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('promotionMarketId', ParseUUIDPipe) promotionMarketId: string,
        @Body() data: PromotionMarketVariantsDto,
    ) {
        return this.promotionsService.removeVariants(
            id,
            promotionMarketId,
            data,
            staff.market_ids,
        );
    }

    @Get(':id/markets/:promotionMarketId/targets')
    @RequirePermission(StaffPermission.PromotionsRead)
    @ResponseMessage('Promotion market targets retrieved successfully')
    findMarketTargets(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('promotionMarketId', ParseUUIDPipe) promotionMarketId: string,
        @Query() query: FindPromotionMarketTargetsDto,
    ) {
        return this.promotionsService.findMarketTargets(
            id,
            promotionMarketId,
            query,
            toScopedAccessActor(staff),
        );
    }

    @Post(':id/activate')
    @RequirePermission(StaffPermission.PromotionsReview)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Promotion activated successfully')
    activate(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.promotionsService.activate(
            id,
            toScopedAccessActor(staff),
        );
    }

    @Post(':id/deactivate')
    @RequirePermission(StaffPermission.PromotionsReview)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Promotion deactivated successfully')
    deactivate(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.promotionsService.deactivate(
            id,
            toScopedAccessActor(staff),
        );
    }

    @Patch(':id')
    @RequirePermission(StaffPermission.PromotionsManage)
    @ResponseMessage('Promotion updated successfully')
    update(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdatePromotionDto,
    ) {
        return this.promotionsService.update(
            id,
            data,
            toScopedAccessActor(staff),
        );
    }

    @Get(':id')
    @RequirePermission(StaffPermission.PromotionsRead)
    @ResponseMessage('Promotion retrieved successfully')
    findOne(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.promotionsService.findOne(id, toScopedAccessActor(staff));
    }
}
