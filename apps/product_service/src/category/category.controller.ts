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
    Public,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
} from '@app/common';
import { CategoryService } from './category.service.js';
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

    @Get()
    @Public()
    @ResponseMessage('Categories retrieved successfully')
    findAll(@Query() query: FindCategoriesDto) {
        return this.categoryService.findAll(query);
    }

    @Get(':id')
    @Public()
    @ResponseMessage('Category retrieved successfully')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.categoryService.findOne(id);
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

    @Delete(':id')
    @RequirePermission(StaffPermission.CategoriesDelete)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Category deleted successfully')
    delete(@Param('id', ParseUUIDPipe) id: string) {
        return this.categoryService.delete(id);
    }
}
