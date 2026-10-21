import {
    Body,
    Controller,
    Delete,
    Get,
    Headers,
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
import { extractBearerToken } from '../shared/extract-bearer-token.js';
import { CreateMarketVariantDto } from './dto/create-market-variant.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { CreateVariantDto } from './dto/create-variant.dto.js';
import { FindProductDto } from './dto/find-product.dto.js';
import { FindProductsDto } from './dto/find-products.dto.js';
import { FindStaffProductsDto } from './dto/find-staff-products.dto.js';
import { UpdateMarketVariantDto } from './dto/update-market-variant.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { UpdateVariantDto } from './dto/update-variant.dto.js';
import { UploadFileDto } from './dto/upload-file.dto.js';
import { ProductService } from './product.service.js';

@Auth('staff')
@Controller('products')
export class ProductController {
    constructor(private readonly productService: ProductService) {}

    @Post('upload-url')
    @RequirePermission(StaffPermission.ProductsCreate)
    @ResponseMessage('Product image upload URLs generated successfully')
    getImageUploadURLs(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: UploadFileDto,
    ) {
        return this.productService.getImageUploadURLs(staff.sub, data);
    }

    @Post()
    @RequirePermission(StaffPermission.ProductsCreate)
    @ResponseMessage('Product created successfully')
    create(@Body() data: CreateProductDto) {
        return this.productService.create(data);
    }

    @Get()
    @Public()
    @ResponseMessage('Products retrieved successfully')
    findAll(@Query() query: FindProductsDto) {
        return this.productService.findAll(query);
    }

    @Get('staff')
    @ResponseMessage('Products retrieved successfully')
    findAllForStaff(@Query() query: FindStaffProductsDto) {
        return this.productService.findAllForStaff(query);
    }

    @Get('staff/:id')
    @ResponseMessage('Product retrieved successfully')
    findOneForStaff(@Param('id', ParseUUIDPipe) id: string) {
        return this.productService.findOneForStaff(id);
    }

    @Get(':id')
    @Public()
    @ResponseMessage('Product retrieved successfully')
    findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: FindProductDto,
    ) {
        return this.productService.findOne(id, query);
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
    @ResponseMessage('Variant updated successfully')
    updateVariant(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('variantId', ParseUUIDPipe) variantId: string,
        @Body() data: UpdateVariantDto,
    ) {
        return this.productService.updateVariant(id, variantId, data);
    }

    @Post(':id/variants/:variantId/markets')
    @RequirePermission(StaffPermission.ProductsApprove)
    @ResponseMessage('Variant added to market successfully')
    addVariantToMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('variantId', ParseUUIDPipe) variantId: string,
        @Body() data: CreateMarketVariantDto,
        @Headers('authorization') authorization?: string,
    ) {
        return this.productService.addVariantToMarket(
            id,
            variantId,
            data,
            staff.market_ids,
            extractBearerToken(authorization),
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
    @ResponseMessage('Product approved successfully')
    approve(@Param('id', ParseUUIDPipe) id: string) {
        return this.productService.approve(id);
    }

    @Post(':id/reject')
    @RequirePermission(StaffPermission.ProductsReject)
    @ResponseMessage('Product rejected successfully')
    reject(@Param('id', ParseUUIDPipe) id: string) {
        return this.productService.reject(id);
    }

    @Post(':id/archive')
    @RequirePermission(StaffPermission.ProductsArchive)
    @ResponseMessage('Product archived successfully')
    archive(@Param('id', ParseUUIDPipe) id: string) {
        return this.productService.archive(id);
    }
}
