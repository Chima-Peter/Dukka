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
    Public,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
    type StaffJwtPayload,
} from '@app/common';
import { toScopedAccessActor } from '../shared/access-control.js';
import { CreateMarketVariantDto } from './dto/create-market-variant.dto.js';
import { CreateVariantDto } from './dto/create-variant.dto.js';
import { FindMarketVariantsDto } from './dto/find-market-variants.dto.js';
import { FindVariantPendingUpdatesDto } from './dto/find-variant-pending-updates.dto.js';
import { PendingUpdateIdsDto } from './dto/pending-update-ids.dto.js';
import { UpdateMarketVariantDto } from './dto/update-market-variant.dto.js';
import { UpdateVariantDto } from './dto/update-variant.dto.js';
import { VariantIdsDto } from './dto/variant-ids.dto.js';
import { ProductVariantService } from './product-variant.service.js';

@Auth('staff')
@Controller('products')
export class ProductVariantController {
    constructor(
        private readonly productVariantService: ProductVariantService,
    ) {}

    @Get('market-variants')
    @ResponseMessage('Market variants retrieved successfully')
    findMarketVariants(@Query() query: FindMarketVariantsDto) {
        return this.productVariantService.findMarketVariants(query);
    }

    @Get('market-variants/:id')
    @ResponseMessage('Market variant retrieved successfully')
    getMarketVariantById(@Param('id', ParseUUIDPipe) id: string) {
        return this.productVariantService.getMarketVariantById(id);
    }

    @Get('variant-pending-updates')
    @RequirePermission(StaffPermission.ProductsReview)
    @ResponseMessage('Variant pending updates retrieved successfully')
    findPendingUpdates(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: FindVariantPendingUpdatesDto,
    ) {
        return this.productVariantService.findPendingUpdatesForStaff(
            query,
            toScopedAccessActor(staff),
        );
    }

    @Post('variant-pending-updates/approve')
    @RequirePermission(StaffPermission.ProductsReview)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Variant pending updates approved successfully')
    approvePendingUpdates(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: PendingUpdateIdsDto,
    ) {
        return this.productVariantService.approvePendingUpdates(
            data.ids,
            toScopedAccessActor(staff),
        );
    }

    @Post('variant-pending-updates/reject')
    @RequirePermission(StaffPermission.ProductsReview)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Variant pending updates rejected successfully')
    rejectPendingUpdates(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: PendingUpdateIdsDto,
    ) {
        return this.productVariantService.rejectPendingUpdates(
            data.ids,
            toScopedAccessActor(staff),
        );
    }

    @Get('variant-pending-updates/:id')
    @RequirePermission(StaffPermission.ProductsReview)
    @ResponseMessage('Variant pending update retrieved successfully')
    findPendingUpdate(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.productVariantService.findPendingUpdateById(
            id,
            toScopedAccessActor(staff),
        );
    }

    @Patch('variant-pending-updates/:id')
    @RequirePermission(StaffPermission.ProductsManage)
    @ResponseMessage('Variant pending update updated successfully')
    updatePendingUpdate(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateVariantDto,
    ) {
        return this.productVariantService.updatePendingUpdate(
            id,
            data,
            toScopedAccessActor(staff),
        );
    }

    @Post(':id/variants')
    @RequirePermission(StaffPermission.ProductsManage)
    @ResponseMessage('Variant added successfully')
    addVariant(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: CreateVariantDto,
    ) {
        return this.productVariantService.addVariant(id, data);
    }

    @Patch(':id/variants/:variantId')
    @RequirePermission(StaffPermission.ProductsManage)
    @ResponseMessage('Variant update proposed successfully')
    updateVariant(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('variantId', ParseUUIDPipe) variantId: string,
        @Body() data: UpdateVariantDto,
    ) {
        return this.productVariantService.updateVariant(id, variantId, data);
    }

    @Post(':id/variants/approve')
    @RequirePermission(StaffPermission.ProductsReview)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Variants approved successfully')
    approveVariants(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: VariantIdsDto,
    ) {
        return this.productVariantService.approveVariants(
            id,
            data.variant_ids,
            toScopedAccessActor(staff),
        );
    }

    @Post(':id/variants/reject')
    @RequirePermission(StaffPermission.ProductsReview)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Variants rejected successfully')
    rejectVariants(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: VariantIdsDto,
    ) {
        return this.productVariantService.rejectVariants(
            id,
            data.variant_ids,
            toScopedAccessActor(staff),
        );
    }

    @Post(':id/variants/archive')
    @RequirePermission(StaffPermission.ProductsManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Variants archived successfully')
    archiveVariants(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: VariantIdsDto,
    ) {
        return this.productVariantService.archiveVariants(id, data.variant_ids);
    }

    @Post(':id/variants/:variantId/markets')
    @RequirePermission(StaffPermission.MarketVariantsManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Variant added to market successfully')
    addVariantToMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('variantId', ParseUUIDPipe) variantId: string,
        @Body() data: CreateMarketVariantDto,
    ) {
        return this.productVariantService.addVariantToMarket(
            id,
            variantId,
            data,
            staff.market_ids,
        );
    }

    @Patch('variants/:variantId/markets/:marketId')
    @RequirePermission(StaffPermission.MarketVariantsManage)
    @ResponseMessage('Market variant updated successfully')
    updateMarketVariant(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('variantId', ParseUUIDPipe) variantId: string,
        @Param('marketId', ParseUUIDPipe) marketId: string,
        @Body() data: UpdateMarketVariantDto,
    ) {
        return this.productVariantService.updateMarketVariant(
            variantId,
            marketId,
            data,
            staff.market_ids,
        );
    }

    @Delete('variants/:variantId/markets/:marketId')
    @RequirePermission(StaffPermission.MarketVariantsManage)
    @ResponseMessage('Variant removed from market successfully')
    removeVariantFromMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('variantId', ParseUUIDPipe) variantId: string,
        @Param('marketId', ParseUUIDPipe) marketId: string,
    ) {
        return this.productVariantService.removeVariantFromMarket(
            variantId,
            marketId,
            staff.market_ids,
        );
    }

    @Get(':id/variants/:variantId/markets/:marketId')
    @Public()
    @ResponseMessage('Market variant retrieved successfully')
    getMarketVariant(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('variantId', ParseUUIDPipe) variantId: string,
        @Param('marketId', ParseUUIDPipe) marketId: string,
    ) {
        return this.productVariantService.getMarketVariant(
            id,
            variantId,
            marketId,
        );
    }
}
