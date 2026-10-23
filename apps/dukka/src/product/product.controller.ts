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
    CurrentCustomer,
    OptionalCustomerAuth,
    Public,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
    type CustomerJwtPayload,
    type StaffJwtPayload,
} from '@app/common';
import { CreateMarketVariantDto } from './dto/create-market-variant.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { CreateVariantDto } from './dto/create-variant.dto.js';
import { FindProductDto } from './dto/find-product.dto.js';
import { FindProductsDto } from './dto/find-products.dto.js';
import { FindStaffProductsDto } from './dto/find-staff-products.dto.js';
import { UpdateMarketVariantDto } from './dto/update-market-variant.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { UpdateProductImagesDto } from './dto/update-product-images.dto.js';
import { FindVariantPendingUpdatesDto } from './dto/find-variant-pending-updates.dto.js';
import { PendingUpdateIdsDto } from './dto/pending-update-ids.dto.js';
import { UpdateVariantDto } from './dto/update-variant.dto.js';
import { UploadFileDto } from './dto/upload-file.dto.js';
import { VariantIdsDto } from './dto/variant-ids.dto.js';
import { ProductService } from './product.service.js';

@Auth('staff')
@Controller('products')
export class ProductController {
    constructor(private readonly productService: ProductService) {}

    @Post('upload-url')
    @RequirePermission(StaffPermission.ProductsCreate)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Product image upload URLs generated successfully')
    getImageUploadURLs(@Body() data: UploadFileDto) {
        return this.productService.getImageUploadURLs(data);
    }

    @Post()
    @RequirePermission(StaffPermission.ProductsCreate)
    @ResponseMessage('Product created successfully')
    create(@Body() data: CreateProductDto) {
        return this.productService.create(data);
    }

    @Get()
    @Public()
    @OptionalCustomerAuth()
    @ResponseMessage('Products retrieved successfully')
    findAll(
        @CurrentCustomer({ optional: true }) customer:
            | CustomerJwtPayload
            | undefined,
        @Query() query: FindProductsDto,
    ) {
        return this.productService.findAll(customer?.sub, query);
    }

    @Get('staff')
    @ResponseMessage('Products retrieved successfully')
    findAllForStaff(@Query() query: FindStaffProductsDto) {
        return this.productService.findAllForStaff(query);
    }

    @Get('variant-pending-updates')
    @ResponseMessage('Variant pending updates retrieved successfully')
    findPendingUpdates(@Query() query: FindVariantPendingUpdatesDto) {
        return this.productService.findPendingUpdatesForStaff(query);
    }

    @Post('variant-pending-updates/approve')
    @RequirePermission(StaffPermission.ProductsApprove)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Variant pending updates approved successfully')
    approvePendingUpdates(@Body() data: PendingUpdateIdsDto) {
        return this.productService.approvePendingUpdates(data.ids);
    }

    @Post('variant-pending-updates/reject')
    @RequirePermission(StaffPermission.ProductsReject)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Variant pending updates rejected successfully')
    rejectPendingUpdates(@Body() data: PendingUpdateIdsDto) {
        return this.productService.rejectPendingUpdates(data.ids);
    }

    @Get('variant-pending-updates/:id')
    @ResponseMessage('Variant pending update retrieved successfully')
    findPendingUpdate(@Param('id', ParseUUIDPipe) id: string) {
        return this.productService.findPendingUpdateById(id);
    }

    @Patch('variant-pending-updates/:id')
    @RequirePermission(StaffPermission.ProductsUpdate)
    @ResponseMessage('Variant pending update updated successfully')
    updatePendingUpdate(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateVariantDto,
    ) {
        return this.productService.updatePendingUpdate(id, data);
    }

    @Get('staff/:id')
    @ResponseMessage('Product retrieved successfully')
    findOneForStaff(@Param('id', ParseUUIDPipe) id: string) {
        return this.productService.findOneForStaff(id);
    }

    @Get(':id')
    @Public()
    @OptionalCustomerAuth()
    @ResponseMessage('Product retrieved successfully')
    findOne(
        @CurrentCustomer({ optional: true }) customer:
            | CustomerJwtPayload
            | undefined,
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: FindProductDto,
    ) {
        return this.productService.findOne(customer?.sub, id, query);
    }

    @Patch(':id')
    @RequirePermission(StaffPermission.ProductsUpdate)
    @ResponseMessage('Product updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateProductDto,
    ) {
        return this.productService.update(id, data);
    }

    @Patch(':id/images')
    @RequirePermission(StaffPermission.ProductsUpdate)
    @ResponseMessage('Product images updated successfully')
    updateImages(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateProductImagesDto,
    ) {
        return this.productService.updateImages(id, data);
    }

    @Post(':id/variants')
    @RequirePermission(StaffPermission.ProductsUpdate)
    @ResponseMessage('Variant added successfully')
    addVariant(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: CreateVariantDto,
    ) {
        return this.productService.addVariant(id, data);
    }

    @Patch(':id/variants/:variantId')
    @RequirePermission(StaffPermission.ProductsUpdate)
    @ResponseMessage('Variant update proposed successfully')
    updateVariant(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('variantId', ParseUUIDPipe) variantId: string,
        @Body() data: UpdateVariantDto,
    ) {
        return this.productService.updateVariant(id, variantId, data);
    }

    @Post(':id/variants/approve')
    @RequirePermission(StaffPermission.ProductsApprove)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Variants approved successfully')
    approveVariants(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: VariantIdsDto,
    ) {
        return this.productService.approveVariants(id, data.variant_ids);
    }

    @Post(':id/variants/reject')
    @RequirePermission(StaffPermission.ProductsReject)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Variants rejected successfully')
    rejectVariants(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: VariantIdsDto,
    ) {
        return this.productService.rejectVariants(id, data.variant_ids);
    }

    @Post(':id/variants/archive')
    @RequirePermission(StaffPermission.ProductsArchive)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Variants archived successfully')
    archiveVariants(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: VariantIdsDto,
    ) {
        return this.productService.archiveVariants(id, data.variant_ids);
    }

    @Post(':id/variants/:variantId/markets')
    @RequirePermission(StaffPermission.ProductsApprove)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Variant added to market successfully')
    addVariantToMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('variantId', ParseUUIDPipe) variantId: string,
        @Body() data: CreateMarketVariantDto,
    ) {
        return this.productService.addVariantToMarket(
            id,
            variantId,
            data,
            staff.market_ids,
        );
    }

    @Patch('variants/:variantId/markets/:marketId')
    @RequirePermission(StaffPermission.ProductsUpdate)
    @ResponseMessage('Market variant updated successfully')
    updateMarketVariant(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('variantId', ParseUUIDPipe) variantId: string,
        @Param('marketId', ParseUUIDPipe) marketId: string,
        @Body() data: UpdateMarketVariantDto,
    ) {
        return this.productService.updateMarketVariant(
            variantId,
            marketId,
            data,
            staff.market_ids,
        );
    }

    @Delete('variants/:variantId/markets/:marketId')
    @RequirePermission(StaffPermission.ProductsApprove)
    @ResponseMessage('Variant removed from market successfully')
    removeVariantFromMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('variantId', ParseUUIDPipe) variantId: string,
        @Param('marketId', ParseUUIDPipe) marketId: string,
    ) {
        return this.productService.removeVariantFromMarket(
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
        return this.productService.getMarketVariant(id, variantId, marketId);
    }

    @Post(':id/approve')
    @RequirePermission(StaffPermission.ProductsApprove)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Product approved successfully')
    approve(@Param('id', ParseUUIDPipe) id: string) {
        return this.productService.approve(id);
    }

    @Post(':id/reject')
    @RequirePermission(StaffPermission.ProductsReject)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Product rejected successfully')
    reject(@Param('id', ParseUUIDPipe) id: string) {
        return this.productService.reject(id);
    }

    @Post(':id/archive')
    @RequirePermission(StaffPermission.ProductsArchive)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Product archived successfully')
    archive(@Param('id', ParseUUIDPipe) id: string) {
        return this.productService.archive(id);
    }
}
