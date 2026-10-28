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
import { AddPromotionMarketDto } from './dto/add-promotion-market.dto.js';
import { CreateDiscountDto } from './dto/create-discount.dto.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { FindPromotionMarketTargetsDto } from './dto/find-promotion-market-targets.dto.js';
import { FindPromotionsDto } from './dto/find-promotions.dto.js';
import { UpdateDiscountDto } from './dto/update-discount.dto.js';
import { UpdatePromotionDto } from './dto/update-promotion.dto.js';
import { UpdatePromotionMarketDto } from './dto/update-promotion-market.dto.js';
import { PromotionsService } from './promotions.service.js';

@Auth('staff')
@Controller('promotions')
export class PromotionsController {
    constructor(private readonly promotionsService: PromotionsService) {}

    @Post()
    @RequirePermission(StaffPermission.PromotionsCreate)
    @ResponseMessage('Promotion created successfully')
    create(@Body() data: CreatePromotionDto) {
        return this.promotionsService.create(data);
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

    @Get('discounts')
    @RequirePermission(StaffPermission.PromotionsRead)
    @ResponseMessage('Discounts retrieved successfully')
    findAllDiscounts() {
        return this.promotionsService.findAllDiscounts();
    }

    @Post('discounts')
    @RequirePermission(StaffPermission.PromotionsCreate)
    @ResponseMessage('Discount created successfully')
    createDiscount(@Body() data: CreateDiscountDto) {
        return this.promotionsService.createDiscount(data);
    }

    @Patch('discounts/:id')
    @RequirePermission(StaffPermission.PromotionsUpdate)
    @ResponseMessage('Discount updated successfully')
    updateDiscount(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateDiscountDto,
    ) {
        return this.promotionsService.updateDiscount(id, data);
    }

    @Post(':id/markets')
    @RequirePermission(StaffPermission.PromotionsCreate)
    @ResponseMessage('Promotion market added successfully')
    addMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: AddPromotionMarketDto,
    ) {
        return this.promotionsService.addMarket(id, data, staff.market_ids);
    }

    @Patch(':id/markets/:promotionMarketId')
    @RequirePermission(StaffPermission.PromotionsUpdate)
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
    @RequirePermission(StaffPermission.PromotionsActivate)
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
    @RequirePermission(StaffPermission.PromotionsDeactivate)
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

    @Get(':id/markets/:promotionMarketId/targets')
    @RequirePermission(StaffPermission.PromotionsRead)
    @ResponseMessage('Promotion market targets retrieved successfully')
    findMarketTargets(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('promotionMarketId', ParseUUIDPipe) promotionMarketId: string,
        @Query() query: FindPromotionMarketTargetsDto,
    ) {
        return this.promotionsService.findMarketTargets(
            id,
            promotionMarketId,
            query,
        );
    }

    @Post(':id/activate')
    @RequirePermission(StaffPermission.PromotionsActivate)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Promotion activated successfully')
    activate(@Param('id', ParseUUIDPipe) id: string) {
        return this.promotionsService.activate(id);
    }

    @Post(':id/deactivate')
    @RequirePermission(StaffPermission.PromotionsDeactivate)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Promotion deactivated successfully')
    deactivate(@Param('id', ParseUUIDPipe) id: string) {
        return this.promotionsService.deactivate(id);
    }

    @Patch(':id')
    @RequirePermission(StaffPermission.PromotionsUpdate)
    @ResponseMessage('Promotion updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdatePromotionDto,
    ) {
        return this.promotionsService.update(id, data);
    }

    @Get(':id')
    @RequirePermission(StaffPermission.PromotionsRead)
    @ResponseMessage('Promotion retrieved successfully')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.promotionsService.findOne(id);
    }
}
