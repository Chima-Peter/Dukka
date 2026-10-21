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
import { CategoryService } from './category.service.js';
import { AddCategoryToMarketDto } from './dto/add-category-to-market.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { FindCategoriesDto } from './dto/find-categories.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Auth('staff')
@Controller('categories')
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) {}

    @Post()
    @RequirePermission(StaffPermission.CategoriesCreate)
    @ResponseMessage('Category created successfully')
    create(@Body() data: CreateCategoryDto) {
        return this.categoryService.create(data);
    }

    @Post(':categoryId/markets')
    @RequirePermission(StaffPermission.CategoriesCreate)
    @ResponseMessage('Category added to market successfully')
    addToMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('categoryId', ParseUUIDPipe) categoryId: string,
        @Body() data: AddCategoryToMarketDto,
    ) {
        return this.categoryService.addToMarket(
            categoryId,
            data,
            staff.market_ids,
        );
    }

    @Get()
    @Public()
    @ResponseMessage('Categories retrieved successfully')
    findAll(@Query() query: FindCategoriesDto) {
        return this.categoryService.findAll(query);
    }

    @Patch(':id')
    @RequirePermission(StaffPermission.CategoriesUpdate)
    @ResponseMessage('Category updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateCategoryDto,
    ) {
        return this.categoryService.update(id, data);
    }

    @Delete(':categoryId/markets/:marketId')
    @RequirePermission(StaffPermission.CategoriesDelete)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Category removed from market successfully')
    removeFromMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('categoryId', ParseUUIDPipe) categoryId: string,
        @Param('marketId', ParseUUIDPipe) marketId: string,
    ) {
        return this.categoryService.removeFromMarket(
            categoryId,
            marketId,
            staff.market_ids,
        );
    }

    @Delete(':id')
    @RequirePermission(StaffPermission.CategoriesDelete)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Category deleted successfully')
    delete(@Param('id', ParseUUIDPipe) id: string) {
        return this.categoryService.delete(id);
    }
}
