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
    CurrentCustomer,
    OptionalCustomerAuth,
    Public,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
    type CustomerJwtPayload,
} from '@app/common';
import { CreateProductDto } from './dto/create-product.dto.js';
import { FindProductDto } from './dto/find-product.dto.js';
import { FindProductsDto } from './dto/find-products.dto.js';
import { FindStaffProductsDto } from './dto/find-staff-products.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { UpdateProductImagesDto } from './dto/update-product-images.dto.js';
import { UploadFileDto } from './dto/upload-file.dto.js';
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
