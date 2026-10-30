import {
    BadRequestException,
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
    PRODUCT_BUCKET,
    SupabaseService,
    MarketStatus,
    ProductStatus,
    VariantPendingUpdateStatus,
    VariantStatus,
} from '@app/common';
import { CategoryService } from '../category/category.service.js';
import { MarketsService } from '../markets/markets.service.js';
import { assertStaffHasMarkets } from '../shared/assert-staff-markets.js';
import { assertValidImage } from '../shared/assert-valid-image.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import type { CreateMarketVariantDto } from './dto/create-market-variant.dto.js';
import type { CreateVariantDto } from './dto/create-variant.dto.js';
import type { FindMarketVariantsDto } from './dto/find-market-variants.dto.js';
import type { FindVariantPendingUpdatesDto } from './dto/find-variant-pending-updates.dto.js';
import type { UpdateMarketVariantDto } from './dto/update-market-variant.dto.js';
import type { UpdateVariantDto } from './dto/update-variant.dto.js';
import { ProductRepository } from './product.repository.js';
import { ProductVariantRepository } from './product-variant.repository.js';

@Injectable()
export class ProductVariantService {
    private readonly logger = new Logger(ProductVariantService.name);

    constructor(
        private readonly productVariantRepository: ProductVariantRepository,
        private readonly productRepository: ProductRepository,
        private readonly categoryService: CategoryService,
        private readonly supabaseService: SupabaseService,
        private readonly marketsService: MarketsService,
    ) {}

    async addVariant(productId: string, data: CreateVariantDto) {
        try {
            this.logger.log(`Adding variant to product ${productId}`);
            if (data.image_path) {
                await assertValidImage(this.supabaseService, data.image_path, {
                    logger: this.logger,
                });
            }
            const variant = await this.productVariantRepository.createVariant(
                productId,
                {
                    variant_code: data.variant_code,
                    color: data.color,
                    size: data.size,
                    variant_info: data.variant_info,
                    ...(data.image_path !== undefined && {
                        image_url: this.supabaseService.getPublicURL(
                            data.image_path,
                            PRODUCT_BUCKET,
                        ),
                    }),
                },
            );
            this.logger.log(
                `Variant ${variant.id} added to product ${productId}`,
            );
            const { image, ...rest } = variant;
            return {
                ...rest,
                image_url: image?.image_url ?? null,
            };
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2003'
            ) {
                throw new NotFoundException('Product not found');
            }
            this.handleError(error, 'Product not found');
        }
    }

    async updateVariant(
        productId: string,
        variantId: string,
        data: UpdateVariantDto,
    ) {
        try {
            this.logger.log(
                `Proposing update for variant ${variantId} on product ${productId}`,
            );

            const { image_path, ...fields } = data;
            if (
                fields.variant_code === undefined &&
                fields.color === undefined &&
                fields.size === undefined &&
                fields.variant_info === undefined &&
                image_path === undefined
            ) {
                throw new BadRequestException(
                    'At least one variant field must be updated',
                );
            }

            const pending =
                await this.productVariantRepository.findPendingUpdateForVariant(
                    variantId,
                );
            if (pending) {
                throw new ConflictException(
                    'Variant already has a pending update',
                );
            }

            let image_url: string | undefined;
            if (image_path) {
                await assertValidImage(this.supabaseService, image_path, {
                    logger: this.logger,
                });
                image_url = this.supabaseService.getPublicURL(
                    image_path,
                    PRODUCT_BUCKET,
                );
            }

            const proposal = await this.productVariantRepository.createPendingUpdate(
                variantId,
                {
                    ...fields,
                    ...(image_url !== undefined && { image_url }),
                },
            );
            this.logger.log(
                `Pending update ${proposal.id} created for variant ${variantId}`,
            );
            return proposal;
        } catch (error) {
            this.handleError(error, 'Variant not found');
        }
    }

    async findPendingUpdatesForStaff(query: FindVariantPendingUpdatesDto) {
        try {
            this.logger.log('Fetching variant pending updates for staff');
            if (
                query.from_date !== undefined &&
                query.to_date !== undefined &&
                new Date(query.from_date) > new Date(query.to_date)
            ) {
                throw new BadRequestException(
                    'from_date cannot be greater than to_date',
                );
            }
            const pendingUpdates =
                await this.productVariantRepository.findPendingUpdatesSummary(
                    query,
                );
            this.logger.log('Fetched variant pending updates for staff');
            return pendingUpdates;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findPendingUpdateById(id: string) {
        try {
            this.logger.log(`Fetching variant pending update ${id}`);
            const pendingUpdate =
                await this.productVariantRepository.findPendingUpdateById(id);
            if (!pendingUpdate) {
                throw new NotFoundException('Pending update not found');
            }
            this.logger.log(`Fetched variant pending update ${id}`);
            return pendingUpdate;
        } catch (error) {
            this.handleError(error, 'Pending update not found');
        }
    }

    async updatePendingUpdate(id: string, data: UpdateVariantDto) {
        try {
            this.logger.log(`Updating variant pending update ${id}`);

            const { image_path, ...fields } = data;
            if (
                fields.variant_code === undefined &&
                fields.color === undefined &&
                fields.size === undefined &&
                fields.variant_info === undefined &&
                image_path === undefined
            ) {
                throw new BadRequestException(
                    'At least one variant field must be updated',
                );
            }

            let image_url: string | undefined;
            if (image_path) {
                await assertValidImage(this.supabaseService, image_path, {
                    logger: this.logger,
                });
                image_url = this.supabaseService.getPublicURL(
                    image_path,
                    PRODUCT_BUCKET,
                );
            }

            const result = await this.productVariantRepository.updatePendingUpdate(
                id,
                {
                    ...fields,
                    ...(image_url !== undefined && { image_url }),
                },
            );

            if ('error' in result) {
                if (result.error === 'NOT_FOUND') {
                    throw new NotFoundException('Pending update not found');
                }
                if (result.error === 'INVALID_STATUS') {
                    throw new BadRequestException(
                        'Only pending or rejected updates can be edited',
                    );
                }
                throw new ConflictException(
                    'Variant already has a pending update',
                );
            }

            const { previousImageUrl, pendingUpdate } = result;
            if (
                image_url !== undefined &&
                previousImageUrl &&
                previousImageUrl !== image_url
            ) {
                await this.safeDeleteProductImage(previousImageUrl);
            }

            this.logger.log(`Variant pending update ${id} updated`);
            return pendingUpdate;
        } catch (error) {
            this.handleError(error, 'Pending update not found');
        }
    }

    private async safeDeleteProductImage(publicUrl: string): Promise<void> {
        await this.safeDeleteProductImages([publicUrl]);
    }

    private async safeDeleteProductImages(publicUrls: string[]): Promise<void> {
        const storagePaths = publicUrls
            .map((url) => this.toStoragePath(url))
            .filter((path): path is string => path !== null);

        if (storagePaths.length === 0) {
            return;
        }

        try {
            await this.supabaseService.deleteFile(
                storagePaths,
                PRODUCT_BUCKET,
            );
        } catch (error) {
            this.logger.warn(
                `Failed to delete product image(s) ${storagePaths.join(',')}: ${error}`,
            );
        }
    }

    private toStoragePath(publicUrl: string): string | null {
        const prefix = this.supabaseService.getPublicURL('', PRODUCT_BUCKET);
        if (!publicUrl.startsWith(prefix)) {
            return null;
        }
        return decodeURIComponent(publicUrl.slice(prefix.length));
    }

    async addVariantToMarket(
        productId: string,
        variantId: string,
        data: CreateMarketVariantDto,
        staffMarketIds: string[],
    ) {
        try {
            this.logger.log(
                `Adding variant ${variantId} to market ${data.market_id}`,
            );
            const product = await this.productRepository.findById(productId);
            if (!product) {
                throw new NotFoundException('Product not found');
            }
            if (product.status !== ProductStatus.ACTIVE) {
                throw new BadRequestException(
                    'Only approved products can have variants added to a market',
                );
            }

            const variant = await this.productVariantRepository.findVariantInProduct(
                productId,
                variantId,
            );
            if (!variant) {
                throw new NotFoundException('Variant not found');
            }
            if (variant.status !== VariantStatus.ACTIVE) {
                throw new BadRequestException(
                    'Only approved variants can be added to a market',
                );
            }

            assertStaffHasMarkets(staffMarketIds, [data.market_id]);
            const market = await this.marketsService.findOne(
                data.market_id,
                staffMarketIds,
            );
            if (market.status !== MarketStatus.OPEN) {
                throw new BadRequestException('Market is not open');
            }

            const categoryInMarket = await this.categoryService.existsInMarket(
                product.category_id,
                data.market_id,
            );
            if (!categoryInMarket) {
                throw new BadRequestException(
                    'Product category is not available in this market',
                );
            }

            try {
                const marketVariant =
                    await this.productVariantRepository.createMarketVariant({
                        variant_id: variantId,
                        market_id: data.market_id,
                        price: data.price,
                        currency: market.currency.code,
                    });
                this.logger.log(
                    `Market variant created ${marketVariant.id} for variant ${variantId}`,
                );
                return marketVariant;
            } catch (error) {
                if (
                    error instanceof PrismaClientKnownRequestError &&
                    error.code === 'P2002'
                ) {
                    const reopened =
                        await this.productVariantRepository.reopenMarketVariant(
                            {
                                variant_id: variantId,
                                market_id: data.market_id,
                                price: data.price,
                                currency: market.currency.code,
                            },
                        );
                    if (reopened) {
                        this.logger.log(
                            `Market variant reopened ${reopened.id} for variant ${variantId}`,
                        );
                        return reopened;
                    }
                    throw new ConflictException(
                        'Variant is already listed in this market',
                    );
                }
                throw error;
            }
        } catch (error) {
            this.handleError(error, 'Variant not found');
        }
    }

    async updateMarketVariant(
        variantId: string,
        marketId: string,
        data: UpdateMarketVariantDto,
        staffMarketIds: string[],
    ) {
        try {
            this.logger.log(
                `Updating market variant for variant ${variantId} in market ${marketId}`,
            );
            assertStaffHasMarkets(staffMarketIds, [marketId]);
            const marketVariant =
                await this.productVariantRepository.updateMarketVariant(
                    variantId,
                    marketId,
                    data.price,
                );
            this.logger.log(
                `Market variant updated for variant ${variantId} in market ${marketId}`,
            );
            return marketVariant;
        } catch (error) {
            this.handleError(error, 'Market variant not found');
        }
    }

    async removeVariantFromMarket(
        variantId: string,
        marketId: string,
        staffMarketIds: string[],
    ) {
        try {
            this.logger.log(
                `Removing variant ${variantId} from market ${marketId}`,
            );
            assertStaffHasMarkets(staffMarketIds, [marketId]);
            const marketVariant =
                await this.productVariantRepository.closeMarketVariant(
                    variantId,
                    marketId,
                );
            this.logger.log(
                `Market variant closed for variant ${variantId} in market ${marketId}`,
            );
            return marketVariant;
        } catch (error) {
            this.handleError(error, 'Market variant not found');
        }
    }

    async findMarketVariants(
        query: FindMarketVariantsDto,
        staffMarketIds: string[],
    ) {
        try {
            this.logger.log('Fetching market variants');
            assertStaffHasMarkets(staffMarketIds, [query.market_id]);
            const page = await this.productVariantRepository.findMarketVariants(
                query,
                [query.market_id],
            );
            this.logger.log('Fetched market variants');
            return page;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getMarketVariant(
        productId: string,
        variantId: string,
        marketId: string,
    ) {
        try {
            this.logger.log(
                `Fetching market variant for variant ${variantId} in market ${marketId}`,
            );
            const marketVariant =
                await this.productVariantRepository.findMarketVariant(
                    productId,
                    variantId,
                    marketId,
                    ProductStatus.ACTIVE,
                );
            if (!marketVariant) {
                throw new NotFoundException('Market variant not found');
            }
            this.logger.log(
                `Fetched market variant for variant ${variantId} in market ${marketId}`,
            );
            return marketVariant;
        } catch (error) {
            this.handleError(error, 'Market variant not found');
        }
    }

    async approveVariants(
        productId: string,
        variantIds: string[],
    ): Promise<void> {
        return this.transitionVariantsStatus(
            productId,
            variantIds,
            VariantStatus.ACTIVE,
            [
                VariantStatus.PENDING_REVIEW,
                VariantStatus.ARCHIVED,
                VariantStatus.REJECTED,
            ],
            'One or more variants are already approved',
            'Approving',
            'approved',
        );
    }

    async rejectVariants(
        productId: string,
        variantIds: string[],
    ): Promise<void> {
        return this.transitionVariantsStatus(
            productId,
            variantIds,
            VariantStatus.REJECTED,
            [VariantStatus.PENDING_REVIEW],
            'Only variants pending review can be rejected',
            'Rejecting',
            'rejected',
        );
    }

    async approvePendingUpdates(pendingUpdateIds: string[]): Promise<void> {
        try {
            this.logger.log(
                `Approving ${pendingUpdateIds.length} pending update(s)`,
            );
            const pendingUpdates =
                await this.productVariantRepository.findPendingUpdatesByIds(
                    pendingUpdateIds,
                );
            if (pendingUpdates.length !== pendingUpdateIds.length) {
                throw new NotFoundException(
                    'One or more pending updates were not found',
                );
            }
            if (
                pendingUpdates.some(
                    (update) =>
                        update.status !== VariantPendingUpdateStatus.PENDING,
                )
            ) {
                throw new BadRequestException(
                    'Only pending updates can be approved',
                );
            }

            const previousImageUrls = pendingUpdates
                .filter((update) => update.image_url !== null)
                .map((update) => update.variant.image?.image_url)
                .filter((url): url is string => !!url);

            await this.productVariantRepository.approvePendingUpdates(pendingUpdates);

            await this.safeDeleteProductImages(previousImageUrls);
            this.logger.log(
                `Approved ${pendingUpdateIds.length} pending update(s)`,
            );
        } catch (error) {
            this.handleError(error, 'Pending update not found');
        }
    }

    async rejectPendingUpdates(pendingUpdateIds: string[]): Promise<void> {
        try {
            this.logger.log(
                `Rejecting ${pendingUpdateIds.length} pending update(s)`,
            );
            const pendingUpdates =
                await this.productVariantRepository.findPendingUpdatesByIds(
                    pendingUpdateIds,
                );
            if (pendingUpdates.length !== pendingUpdateIds.length) {
                throw new NotFoundException(
                    'One or more pending updates were not found',
                );
            }
            if (
                pendingUpdates.some(
                    (update) =>
                        update.status !== VariantPendingUpdateStatus.PENDING,
                )
            ) {
                throw new BadRequestException(
                    'Only pending updates can be rejected',
                );
            }

            await this.productVariantRepository.rejectPendingUpdates(pendingUpdateIds);

            const proposedImageUrls = pendingUpdates
                .map((update) => update.image_url)
                .filter((url): url is string => !!url);
            await this.safeDeleteProductImages(proposedImageUrls);

            this.logger.log(
                `Rejected ${pendingUpdateIds.length} pending update(s)`,
            );
        } catch (error) {
            this.handleError(error, 'Pending update not found');
        }
    }

    async archiveVariants(
        productId: string,
        variantIds: string[],
    ): Promise<void> {
        try {
            this.logger.log(
                `Archiving ${variantIds.length} variant(s) on product ${productId}`,
            );
            await this.assertVariantsReadyForTransition(
                productId,
                variantIds,
                [
                    VariantStatus.ACTIVE,
                    VariantStatus.REJECTED,
                    VariantStatus.PENDING_REVIEW,
                ],
                'One or more variants are already archived or cannot be archived from their current status',
            );
            await this.productVariantRepository.archiveVariants(productId, variantIds);
            this.logger.log(
                `Archived ${variantIds.length} variant(s) on product ${productId}`,
            );
        } catch (error) {
            this.handleError(error, 'Variant not found');
        }
    }

    private async assertVariantsReadyForTransition(
        productId: string,
        variantIds: string[],
        allowedFrom: VariantStatus[],
        invalidMessage: string,
    ): Promise<void> {
        const existing = await this.productVariantRepository.findVariantsInProduct(
            productId,
            variantIds,
        );
        if (existing.length !== variantIds.length) {
            throw new NotFoundException('One or more variants were not found');
        }
        if (existing.some((variant) => !allowedFrom.includes(variant.status))) {
            throw new BadRequestException(invalidMessage);
        }
    }

    private async transitionVariantsStatus(
        productId: string,
        variantIds: string[],
        nextStatus: VariantStatus,
        allowedFrom: VariantStatus[],
        invalidMessage: string,
        actionLog: string,
        doneLog: string,
    ): Promise<void> {
        try {
            this.logger.log(
                `${actionLog} ${variantIds.length} variant(s) on product ${productId}`,
            );
            await this.assertVariantsReadyForTransition(
                productId,
                variantIds,
                allowedFrom,
                invalidMessage,
            );
            await this.productVariantRepository.updateVariantsStatus(
                productId,
                variantIds,
                nextStatus,
            );
            this.logger.log(
                `${variantIds.length} variant(s) ${doneLog} on product ${productId}`,
            );
        } catch (error) {
            this.handleError(error, 'Variant not found');
        }
    }

    private handleError(
        error: unknown,
        notFoundMessage = 'Product not found',
    ): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException(
                    'A variant with this code already exists',
                );
            }
            if (error.code === 'P2003' || error.code === 'P2025') {
                this.logger.warn(
                    `Product relation error ${error.code}: ${error.message}`,
                );
                const relationError = this.productRelationNotFound(error);
                if (relationError !== null) {
                    throw relationError;
                }
                if (error.code === 'P2025') {
                    throw new NotFoundException(notFoundMessage);
                }
                throw new ConflictException('Invalid product reference');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }

    private productRelationNotFound(
        error: PrismaClientKnownRequestError,
    ): NotFoundException | null {
        const model = prismaMissingRecordModel(error);
        switch (model) {
            case 'category':
                return new NotFoundException('Category not found');
            case 'market':
                return new NotFoundException('Market not found');
            case 'variant':
                return new NotFoundException('Variant not found');
            case 'product':
                return new NotFoundException('Product not found');
            default:
                break;
        }

        if (prismaHintIncludes(error, 'category_id', "'category'")) {
            return new NotFoundException('Category not found');
        }
        if (prismaHintIncludes(error, 'market_id', "'market'")) {
            return new NotFoundException('Market not found');
        }
        if (prismaHintIncludes(error, 'variant_id', "'variant'")) {
            return new NotFoundException('Variant not found');
        }
        return null;
    }
}
