import {
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { RedisService, type Category } from '@app/common';
import { CustomerService } from '../customer/customer.service.js';
import {
    ACCESS_CONTROL_ERROR,
    assertActorBelongsToMarkets,
} from '../shared/access-control.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import {
    CATEGORIES_LIST_LOCK_RETRY_MS,
    CATEGORIES_LIST_LOCK_TTL_MS,
    CATEGORIES_LIST_TTL_SECONDS,
    RedisKeys,
} from '../shared/redis.constants.js';
import { resolveMarketId } from '../shared/resolve-market-id.js';
import { CategoryRepository } from './category.repository.js';
import type { AddCategoryToMarketDto } from './dto/add-category-to-market.dto.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type { FindCategoriesDto } from './dto/find-categories.dto.js';
import type { FindStaffCategoriesDto } from './dto/find-staff-categories.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';
import type { MarketCategoryItem } from './types/market-category.type.js';
import type { PrismaErrorMap } from './types/prisma-error.type.js';

type CategoriesPage = {
    items: MarketCategoryItem[];
    next_cursor: string | null;
};

@Injectable()
export class CategoryService {
    private readonly logger = new Logger(CategoryService.name);

    constructor(
        private readonly categoryRepository: CategoryRepository,
        private readonly customerService: CustomerService,
        private readonly redisService: RedisService,
    ) {}

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
            const marketIds =
                await this.categoryRepository.findMarketIdsByCategoryId(id);
            const category = await this.categoryRepository.update(
                id,
                data.name,
            );
            await this.invalidateCategoriesListCacheForMarkets(marketIds);
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

    async existsInMarket(categoryId: string, marketId: string) {
        return await this.categoryRepository.existsInMarket(
            categoryId,
            marketId,
        );
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
            assertActorBelongsToMarkets(staffMarketIds, [data.market_id]);
            const marketCategory = await this.categoryRepository.addToMarket(
                categoryId,
                data.market_id,
            );
            await this.invalidateCategoriesListCache(data.market_id);
            this.logger.log(
                `Category ${categoryId} added to market ${data.market_id}`,
            );
            return marketCategory;
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                (error.code === 'P2003' || error.code === 'P2025')
            ) {
                throw this.marketCategoryRelationNotFound(error);
            }
            this.handleError(error, {
                conflict: {
                    P2002: 'Category already exists in this market',
                },
            });
        }
    }

    async findAll(customerId: string | undefined, query: FindCategoriesDto) {
        try {
            const marketId = await resolveMarketId(
                this.customerService,
                customerId,
                query.market_id,
            );
            const limit = query.limit ?? 50;
            const versionKey = RedisKeys.categoriesListVersion(marketId);
            const lockKey = RedisKeys.categoriesListLock(
                marketId,
                query.cursor,
                limit,
            );
            const keyPrefix = RedisKeys.categoriesListPrefix(marketId);
            const keySuffix = RedisKeys.categoriesListSuffix(
                query.cursor,
                limit,
            );
            const waitDeadline = Date.now() + CATEGORIES_LIST_LOCK_TTL_MS;

            while (true) {
                const outcome =
                    await this.redisService.getVersionedObjectOrLock<CategoriesPage>(
                        versionKey,
                        lockKey,
                        keyPrefix,
                        keySuffix,
                        CATEGORIES_LIST_LOCK_TTL_MS,
                    );

                if (outcome.status === 'hit') {
                    this.logger.log(
                        `Cache hit for categories list market ${marketId}`,
                    );
                    return outcome.value;
                }

                if (outcome.status === 'busy') {
                    if (Date.now() >= waitDeadline) {
                        this.logger.warn(
                            `Cache lock wait timed out for categories list market ${marketId}`,
                        );
                        return await this.loadCategoriesPage(
                            marketId,
                            query,
                            limit,
                        );
                    }

                    this.logger.log(
                        `Cache lock busy for categories list market ${marketId}; retrying`,
                    );
                    await sleep(CATEGORIES_LIST_LOCK_RETRY_MS);
                    continue;
                }

                try {
                    this.logger.log(
                        `Fetching categories for market ${marketId}`,
                    );
                    const result = await this.loadCategoriesPage(
                        marketId,
                        query,
                        limit,
                    );
                    await this.redisService.setObjectAndUnlock(
                        outcome.resultKey,
                        lockKey,
                        result,
                        CATEGORIES_LIST_TTL_SECONDS,
                        outcome.token,
                    );
                    this.logger.log(
                        `Fetched categories for market ${marketId}`,
                    );
                    return result;
                } catch (error) {
                    await this.redisService.unlock(lockKey, outcome.token);
                    throw error;
                }
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAllForStaff(query: FindStaffCategoriesDto) {
        try {
            this.logger.log('Fetching categories for staff');
            const page = await this.categoryRepository.findAllForStaff(query);
            this.logger.log('Fetched categories for staff');
            return {
                items: page.items,
                next_cursor: page.next_cursor,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOneForStaff(id: string): Promise<Category> {
        try {
            this.logger.log(`Fetching category ${id} for staff`);
            const category = await this.categoryRepository.findById(id);
            if (!category) {
                throw new NotFoundException('Category not found');
            }
            this.logger.log(`Fetched category ${id} for staff`);
            return category;
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
            assertActorBelongsToMarkets(staffMarketIds, [marketId]);
            const marketCategory =
                await this.categoryRepository.removeFromMarket(
                    categoryId,
                    marketId,
                );
            await this.invalidateCategoriesListCache(marketId);
            this.logger.log(
                `Category ${categoryId} removed from market ${marketId}`,
            );
            return marketCategory;
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                (error.code === 'P2003' || error.code === 'P2025')
            ) {
                throw this.marketCategoryRelationNotFound(error);
            }
            this.handleError(error, {
                notFound: { P2025: 'Category not found in this market' },
                conflict: {
                    P2003:
                        'Cannot remove a category that has products in this market',
                },
            });
        }
    }

    private async loadCategoriesPage(
        marketId: string,
        query: FindCategoriesDto,
        limit: number,
    ): Promise<CategoriesPage> {
        const page = await this.categoryRepository.findAllByMarket({
            ...query,
            market_id: marketId,
            limit,
        });
        return {
            items: page.items,
            next_cursor: page.next_cursor,
        };
    }

    private async invalidateCategoriesListCache(
        marketId: string,
    ): Promise<void> {
        await this.redisService.invalidateVersionKeys([
            RedisKeys.categoriesListVersion(marketId),
        ]);
    }

    private async invalidateCategoriesListCacheForMarkets(
        marketIds: string[],
    ): Promise<void> {
        if (marketIds.length === 0) {
            return;
        }

        await this.redisService.invalidateVersionKeys(
            marketIds.map((marketId) =>
                RedisKeys.categoriesListVersion(marketId),
            ),
        );
    }

    private handleError(error: unknown, messages: PrismaErrorMap = {}): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (
            error instanceof Error &&
            error.message === ACCESS_CONTROL_ERROR.INSUFFICIENT_MARKET_ACCESS
        ) {
            throw new ForbiddenException(
                'Cannot operate on markets outside your assigned markets',
            );
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

    private marketCategoryRelationNotFound(
        error: PrismaClientKnownRequestError,
    ): NotFoundException {
        switch (prismaMissingRecordModel(error)) {
            case 'category':
                return new NotFoundException('Category not found');
            case 'market':
                return new NotFoundException('Market not found');
            default:
                if (prismaHintIncludes(error, 'category_id')) {
                    return new NotFoundException('Category not found');
                }
                if (prismaHintIncludes(error, 'market_id')) {
                    return new NotFoundException('Market not found');
                }
                return new NotFoundException('Category not found');
        }
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
