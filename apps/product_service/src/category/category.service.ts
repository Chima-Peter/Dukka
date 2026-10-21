import {
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { Category } from '../../generated/prisma/client.js';
import { CategoryRepository } from './category.repository.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type { FindCategoriesDto } from './dto/find-categories.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoryService {
    private readonly logger = new Logger(CategoryService.name);

    constructor(private readonly categoryRepository: CategoryRepository) {}

    async create(data: CreateCategoryDto): Promise<Category> {
        try {
            this.logger.log(`Creating category ${data.name}`);
            const category = await this.categoryRepository.create(data.name);
            this.logger.log(`Category created ${category.id}`);
            return category;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(query: FindCategoriesDto): Promise<Category[]> {
        try {
            this.logger.log('Fetching categories');
            return await this.categoryRepository.findAll(query);
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(id: string): Promise<Category> {
        try {
            this.logger.log(`Fetching category ${id}`);
            const category = await this.categoryRepository.findById(id);
            if (!category) {
                throw new NotFoundException('Category not found');
            }
            return category;
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(id: string, data: UpdateCategoryDto): Promise<Category> {
        try {
            this.logger.log(`Updating category ${id}`);
            const category = await this.categoryRepository.update(
                id,
                data.name,
            );
            this.logger.log(`Category updated ${id}`);
            return category;
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(id: string): Promise<Category> {
        try {
            this.logger.log(`Deleting category ${id}`);
            const category = await this.categoryRepository.delete(id);
            this.logger.log(`Category deleted ${id}`);
            return category;
        } catch (error) {
            this.handleError(error);
        }
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                throw new NotFoundException('Category not found');
            }
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException(
                    'A category with this name already exists',
                );
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
