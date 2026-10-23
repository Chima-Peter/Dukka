import { Module } from '@nestjs/common';
import { CustomerModule } from '../customer/customer.module.js';
import { CategoryController } from './category.controller.js';
import { CategoryRepository } from './category.repository.js';
import { CategoryService } from './category.service.js';

@Module({
    imports: [CustomerModule],
    controllers: [CategoryController],
    providers: [CategoryService, CategoryRepository],
    exports: [CategoryService, CategoryRepository],
})
export class CategoryModule {}
