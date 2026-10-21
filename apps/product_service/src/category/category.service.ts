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
import { assertStaffHasMarkets } from '../shared/assert-staff-markets.js';
import { CategoryRepository } from './category.repository.js';
import type { AddCategoryToMarketDto } from './dto/add-category-to-market.dto.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type { FindCategoriesDto } from './dto/find-categories.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';
import type { MarketCategoryItem } from './types/market-category.type.js';
import type { PrismaErrorMap } from './types/prisma-error.type.js';

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
            this.handleError(error, {
                conflict: {
                    P2002: 'A category with this name already exists',
                },
            });
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
            this.handleError(error, {
                notFound: { P2025: 'Category not found' },
                conflict: {
                    P2002: 'A category with this name already exists',
                },
            });
        }
    }

    async delete(id: string): Promise<Category> {
        try {
            this.logger.log(`Deleting category ${id}`);
            const category = await this.categoryRepository.delete(id);
            this.logger.log(`Category deleted ${id}`);
            return category;
        } catch (error) {
            this.handleError(error, {
                notFound: { P2025: 'Category not found' },
                conflict: {
                    P2003:
                        'Cannot delete a category that is still assigned to markets',
                    P2014:
                        'Cannot delete a category that is still assigned to markets',
                },
            });
        }
    }

    async addToMarket(
        categoryId: string,
        data: AddCategoryToMarketDto,
        staffMarketIds: string[],
    ): Promise<MarketCategoryItem> {
        try {
            this.logger.log(
                `Adding category ${categoryId} to market ${data.market_id}`,
            );
            assertStaffHasMarkets(staffMarketIds, [data.market_id]);
            const marketCategory = await this.categoryRepository.addToMarket(
                categoryId,
                data.market_id,
            );
            this.logger.log(
                `Category ${categoryId} added to market ${data.market_id}`,
            );
            return marketCategory;
        } catch (error) {
            this.handleError(error, {
                notFound: { P2003: 'Category not found' },
                conflict: {
                    P2002: 'Category already exists in this market',
                },
            });
        }
    }

    async findAll(query: FindCategoriesDto): Promise<MarketCategoryItem[]> {
        try {
            this.logger.log(
                `Fetching categories for market ${query.market_id}`,
            );
            return await this.categoryRepository.findAllByMarket(
                query.market_id,
            );
        } catch (error) {
            this.handleError(error);
        }
    }

    async removeFromMarket(
        categoryId: string,
        marketId: string,
        staffMarketIds: string[],
    ): Promise<MarketCategoryItem> {
        try {
            this.logger.log(
                `Removing category ${categoryId} from market ${marketId}`,
            );
            assertStaffHasMarkets(staffMarketIds, [marketId]);
            const marketCategory =
                await this.categoryRepository.removeFromMarket(
                    categoryId,
                    marketId,
                );
            this.logger.log(
                `Category ${categoryId} removed from market ${marketId}`,
            );
            return marketCategory;
        } catch (error) {
            this.handleError(error, {
                notFound: { P2025: 'Category not found in market' },
                conflict: {
                    P2003:
                        'Cannot remove a category that has products in this market',
                },
            });
        }
    }

    private handleError(error: unknown, messages: PrismaErrorMap = {}): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (error instanceof PrismaClientKnownRequestError) {
            const notFoundMessage =
                messages.notFound?.[
                    error.code as keyof NonNullable<PrismaErrorMap['notFound']>
                ];
            if (notFoundMessage !== undefined) {
                throw new NotFoundException(notFoundMessage);
            }

            const conflictMessage =
                messages.conflict?.[
                    error.code as keyof NonNullable<PrismaErrorMap['conflict']>
                ];
            if (conflictMessage !== undefined) {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException(conflictMessage);
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
