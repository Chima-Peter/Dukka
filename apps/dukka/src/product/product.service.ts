import { randomUUID } from 'node:crypto';
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
import { PRODUCT_BUCKET, SupabaseService } from '@app/common';
import {
    MarketStatus,
    Prisma,
    ProductStatus,
    VariantPendingUpdateStatus,
    VariantStatus,
    type Product,
} from '../../generated/prisma/client.js';
import { CustomerService } from '../customer/customer.service.js';
import { MarketsService } from '../markets/markets.service.js';
import { assertStaffHasMarkets } from '../shared/assert-staff-markets.js';
import { assertValidImage } from '../shared/assert-valid-image.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import { resolveMarketId } from '../shared/resolve-market-id.js';
import type { CreateMarketVariantDto } from './dto/create-market-variant.dto.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { CreateVariantDto } from './dto/create-variant.dto.js';
import type { FindProductDto } from './dto/find-product.dto.js';
import type { FindProductsDto } from './dto/find-products.dto.js';
import type { FindStaffProductsDto } from './dto/find-staff-products.dto.js';
import type { FindVariantPendingUpdatesDto } from './dto/find-variant-pending-updates.dto.js';
import type { CreateProductImageDto } from './dto/create-product-image.dto.js';
import type { UpdateMarketVariantDto } from './dto/update-market-variant.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import type { UpdateProductImagesDto } from './dto/update-product-images.dto.js';
import type { UpdateVariantDto } from './dto/update-variant.dto.js';
import type { UploadFileDto } from './dto/upload-file.dto.js';
import { ProductRepository } from './product.repository.js';
import { ImageUploadUrls, SignedUpload } from './types/upload.type.js';

@Injectable()
export class ProductService {
    private readonly logger = new Logger(ProductService.name);

    constructor(
        private readonly productRepository: ProductRepository,
        private readonly supabaseService: SupabaseService,
        private readonly marketsService: MarketsService,
        private readonly customerService: CustomerService,
    ) {}

    async getImageUploadURLs(data: UploadFileDto): Promise<ImageUploadUrls> {
        try {
            this.logger.log(
                `Generating upload URLs: ${data.product_images.length} product image(s), ${data.variant_images.length} variant image(s)`,
            );
            const [product_images, variant_images] = await Promise.all([
                this.createUploadMap(data.product_images),
                this.createUploadMap(data.variant_images),
            ]);
            return { product_images, variant_images };
        } catch (error) {
            this.handleError(error);
        }
    }

    private async createUploadMap(
        names: string[],
    ): Promise<Record<string, SignedUpload>> {
        const entries = await Promise.all(
            names.map(async (name) => {
                const upload = await this.supabaseService.createSignedUploadUrl(
                    randomUUID(),
                    name,
                    PRODUCT_BUCKET,
                );
                return [name, upload] as const;
            }),
        );
        return Object.fromEntries(entries);
    }

    async create(data: CreateProductDto) {
        try {
            this.logger.log(
                `Creating product ${data.name} with ${data.variants.length} variant(s)`,
            );

            const variantImagePaths = data.variants
                .map((variant) => variant.image_path)
                .filter((path): path is string => path !== undefined);
            await Promise.all(
                [
                    ...data.images.map((image) => image.image_path),
                    ...variantImagePaths,
                ].map((path) =>
                    assertValidImage(this.supabaseService, path, {
                        logger: this.logger,
                    }),
                ),
            );

            const product = await this.productRepository.create({
                name: data.name,
                description: data.description,
                specs: data.specs,
                market_category_id: data.market_category_id,
                images: data.images.map((image) => ({
                    image_url: this.supabaseService.getPublicURL(
                        image.image_path,
                        PRODUCT_BUCKET,
                    ),
                    sort_order: image.sort_order,
                })),
                variants: data.variants.map((variant) => ({
                    variant_code: variant.variant_code,
                    color: variant.color,
                    size: variant.size,
                    variant_info: variant.variant_info,
                    ...(variant.image_path !== undefined && {
                        image_url: this.supabaseService.getPublicURL(
                            variant.image_path,
                            PRODUCT_BUCKET,
                        ),
                    }),
                })),
            });
            this.logger.log(`Product created ${product.id}`);
            return product;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(customerId: string | undefined, query: FindProductsDto) {
        try {
            this.logger.log('Fetching products');
            this.assertPriceRange(query.min_price, query.max_price);
            const marketId = await resolveMarketId(
                this.customerService,
                customerId,
                query.market_id,
            );
            const page = await this.productRepository.findAllPublic({
                ...query,
                market_id: marketId,
            });
            return {
                items: page.items,
                next_cursor: page.next_cursor,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAllForStaff(query: FindStaffProductsDto) {
        try {
            this.logger.log('Fetching products for staff');
            this.assertPriceRange(query.min_price, query.max_price);
            const page = await this.productRepository.findAll(query);
            return {
                items: page.items,
                next_cursor: page.next_cursor,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(
        customerId: string | undefined,
        id: string,
        query: FindProductDto,
    ) {
        try {
            const marketId = await resolveMarketId(
                this.customerService,
                customerId,
                query.market_id,
            );
            this.logger.log(`Fetching product ${id} for market ${marketId}`);
            return await this.productRepository.findByIdInMarket(
                id,
                marketId,
                ProductStatus.ACTIVE,
            );
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOneForStaff(id: string) {
        try {
            this.logger.log(`Fetching product ${id} for staff`);
            return await this.productRepository.findDetailedById(id);
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(id: string, data: UpdateProductDto): Promise<Product> {
        try {
            this.logger.log(`Updating product ${id}`);
            const product = await this.productRepository.update(id, data);
            this.logger.log(`Product updated ${id}`);
            return product;
        } catch (error) {
            this.handleError(error);
        }
    }

    async updateImages(productId: string, data: UpdateProductImagesDto) {
        try {
            this.logger.log(`Updating images for product ${productId}`);

            const desired = await this.resolveProductImages(data.images);
            const desiredUrls = new Set(desired.map((image) => image.image_url));
            if (desiredUrls.size !== desired.length) {
                throw new BadRequestException('Duplicate image URLs are not allowed');
            }

            const removed = await this.productRepository.syncProductImages(
                productId,
                desired,
            );

            if (removed.length > 0) {
                await this.safeDeleteProductImages(
                    removed.map((image) => image.image_url),
                );
            }

            this.logger.log(`Product images updated for ${productId}`);
        } catch (error) {
            this.handleError(error);
        }
    }

    private async resolveProductImages(
        images: CreateProductImageDto[],
    ): Promise<{ image_url: string; sort_order: number }[]> {
        const publicPrefix = this.supabaseService.getPublicURL(
            '',
            PRODUCT_BUCKET,
        );

        return Promise.all(
            images.map(async (image) => {
                if (image.image_path.startsWith(publicPrefix)) {
                    return {
                        image_url: image.image_path,
                        sort_order: image.sort_order,
                    };
                }

                await assertValidImage(this.supabaseService, image.image_path, {
                    logger: this.logger,
                });
                return {
                    image_url: this.supabaseService.getPublicURL(
                        image.image_path,
                        PRODUCT_BUCKET,
                    ),
                    sort_order: image.sort_order,
                };
            }),
        );
    }

    async addVariant(productId: string, data: CreateVariantDto) {
        try {
            this.logger.log(`Adding variant to product ${productId}`);
            if (data.image_path) {
                await assertValidImage(this.supabaseService, data.image_path, {
                    logger: this.logger,
                });
            }
            const variant = await this.productRepository.createVariant(
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
                await this.productRepository.findPendingUpdateForVariant(
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

            const proposal = await this.productRepository.createPendingUpdate(
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
            return await this.productRepository.findPendingUpdatesSummary(
                query,
            );
        } catch (error) {
            this.handleError(error);
        }
    }

    async findPendingUpdateById(id: string) {
        try {
            this.logger.log(`Fetching variant pending update ${id}`);
            const pendingUpdate =
                await this.productRepository.findPendingUpdateById(id);
            if (!pendingUpdate) {
                throw new NotFoundException('Pending update not found');
            }
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

            const result = await this.productRepository.updatePendingUpdate(
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

            const variant = await this.productRepository.findVariantInProduct(
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

            const marketVariant =
                await this.productRepository.createMarketVariant({
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
                throw new ConflictException(
                    'Variant is already listed in this market',
                );
            }
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
                await this.productRepository.updateMarketVariant(
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
                await this.productRepository.deleteMarketVariant(
                    variantId,
                    marketId,
                );
            this.logger.log(
                `Market variant removed for variant ${variantId} in market ${marketId}`,
            );
            return marketVariant;
        } catch (error) {
            this.handleError(error, 'Market variant not found');
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
                await this.productRepository.findMarketVariant(
                    productId,
                    variantId,
                    marketId,
                    ProductStatus.ACTIVE,
                );
            if (!marketVariant) {
                throw new NotFoundException('Market variant not found');
            }
            return marketVariant;
        } catch (error) {
            this.handleError(error, 'Market variant not found');
        }
    }

    async assertMarketVariantAvailable(
        marketVariantId: string,
        tx?: Prisma.TransactionClient,
    ): Promise<void> {
        const variant =
            await this.productRepository.findMarketVariantAvailability(
                marketVariantId,
                tx,
            );

        if (!variant) {
            throw new NotFoundException('Market variant not found');
        }
        if (variant.sold_out) {
            throw new BadRequestException('Market variant is sold out');
        }
    }

    async approve(id: string): Promise<Product> {
        return this.transitionStatus(
            id,
            ProductStatus.ACTIVE,
            [ProductStatus.PENDING_REVIEW],
            'Only products pending review can be approved',
            'Approving',
            'approved',
        );
    }

    async reject(id: string): Promise<Product> {
        return this.transitionStatus(
            id,
            ProductStatus.REJECTED,
            [ProductStatus.PENDING_REVIEW],
            'Only products pending review can be rejected',
            'Rejecting',
            'rejected',
        );
    }

    async archive(id: string): Promise<Product> {
        try {
            this.logger.log(`Archiving product ${id}`);
            const existing = await this.productRepository.findById(id);
            if (!existing) {
                throw new NotFoundException('Product not found');
            }
            const allowedFrom: ProductStatus[] = [
                ProductStatus.ACTIVE,
                ProductStatus.REJECTED,
                ProductStatus.PENDING_REVIEW,
            ];
            if (!allowedFrom.includes(existing.status)) {
                throw new BadRequestException(
                    'Product is already archived or cannot be archived from its current status',
                );
            }
            const product = await this.productRepository.archiveProduct(id);
            this.logger.log(`Product archived ${id}`);
            return product;
        } catch (error) {
            this.handleError(error);
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
                await this.productRepository.findPendingUpdatesByIds(
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

            await this.productRepository.approvePendingUpdates(pendingUpdates);

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
                await this.productRepository.findPendingUpdatesByIds(
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

            await this.productRepository.rejectPendingUpdates(pendingUpdateIds);

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
            await this.productRepository.archiveVariants(productId, variantIds);
            this.logger.log(
                `Archived ${variantIds.length} variant(s) on product ${productId}`,
            );
        } catch (error) {
            this.handleError(error, 'Variant not found');
        }
    }

    private assertPriceRange(minPrice?: number, maxPrice?: number): void {
        if (
            minPrice !== undefined &&
            maxPrice !== undefined &&
            minPrice > maxPrice
        ) {
            throw new BadRequestException(
                'min_price cannot be greater than max_price',
            );
        }
    }

    private async transitionStatus(
        id: string,
        nextStatus: ProductStatus,
        allowedFrom: ProductStatus[],
        invalidMessage: string,
        actionLog: string,
        doneLog: string,
    ): Promise<Product> {
        try {
            this.logger.log(`${actionLog} product ${id}`);
            const existing = await this.productRepository.findById(id);
            if (!existing) {
                throw new NotFoundException('Product not found');
            }
            if (!allowedFrom.includes(existing.status)) {
                throw new BadRequestException(invalidMessage);
            }
            const product = await this.productRepository.updateStatus(
                id,
                nextStatus,
            );
            this.logger.log(`Product ${doneLog} ${id}`);
            return product;
        } catch (error) {
            this.handleError(error);
        }
    }

    private async assertVariantsReadyForTransition(
        productId: string,
        variantIds: string[],
        allowedFrom: VariantStatus[],
        invalidMessage: string,
    ): Promise<void> {
        const existing = await this.productRepository.findVariantsInProduct(
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
            await this.productRepository.updateVariantsStatus(
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
        if (model === 'marketcategor' || model?.startsWith('marketcategor')) {
            return new NotFoundException('Market category not found');
        }
        switch (model) {
            case 'market':
                return new NotFoundException('Market not found');
            case 'variant':
                return new NotFoundException('Variant not found');
            case 'product':
                return new NotFoundException('Product not found');
            default:
                break;
        }

        if (prismaHintIncludes(error, 'market_category')) {
            return new NotFoundException('Market category not found');
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
