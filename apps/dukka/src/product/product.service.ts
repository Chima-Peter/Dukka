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
import {
    PRODUCT_BUCKET,
    SupabaseService,
    ProductPendingUpdateStatus,
    ProductStatus,
    type Product,
} from '@app/common';
import { CustomerService } from '../customer/customer.service.js';
import { assertValidImage } from '../shared/assert-valid-image.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import { resolveMarketId } from '../shared/resolve-market-id.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { FindProductDto } from './dto/find-product.dto.js';
import type { FindProductPendingUpdatesDto } from './dto/find-product-pending-updates.dto.js';
import type { FindProductsDto } from './dto/find-products.dto.js';
import type { FindStaffProductsDto } from './dto/find-staff-products.dto.js';
import type { CreateProductImageDto } from './dto/create-product-image.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import type { UpdateProductImagesDto } from './dto/update-product-images.dto.js';
import type { UploadFileDto } from './dto/upload-file.dto.js';
import { ProductRepository } from './product.repository.js';
import { ImageUploadUrls, SignedUpload } from './types/upload.type.js';

@Injectable()
export class ProductService {
    private readonly logger = new Logger(ProductService.name);

    constructor(
        private readonly productRepository: ProductRepository,
        private readonly supabaseService: SupabaseService,
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
                category_id: data.category_id,
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

    async update(id: string, data: UpdateProductDto) {
        try {
            this.logger.log(`Proposing update for product ${id}`);

            if (
                data.name === undefined &&
                data.description === undefined &&
                data.specs === undefined &&
                data.category_id === undefined
            ) {
                throw new BadRequestException(
                    'At least one product field must be updated',
                );
            }

            const pending =
                await this.productRepository.findPendingUpdateForProduct(id);
            if (pending) {
                throw new ConflictException(
                    'Product already has a pending update',
                );
            }

            const proposal = await this.productRepository.createPendingUpdate(
                id,
                data,
            );
            this.logger.log(
                `Pending update ${proposal.id} created for product ${id}`,
            );
            return proposal;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findPendingUpdatesForStaff(query: FindProductPendingUpdatesDto) {
        try {
            this.logger.log('Fetching product pending updates for staff');
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
            this.logger.log(`Fetching product pending update ${id}`);
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

    async updatePendingUpdate(id: string, data: UpdateProductDto) {
        try {
            this.logger.log(`Updating product pending update ${id}`);

            if (
                data.name === undefined &&
                data.description === undefined &&
                data.specs === undefined &&
                data.category_id === undefined
            ) {
                throw new BadRequestException(
                    'At least one product field must be updated',
                );
            }

            const result = await this.productRepository.updatePendingUpdate(
                id,
                data,
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
                    'Product already has a pending update',
                );
            }

            this.logger.log(`Product pending update ${id} updated`);
            return result.pendingUpdate;
        } catch (error) {
            this.handleError(error, 'Pending update not found');
        }
    }

    async updatePendingUpdateImages(
        id: string,
        data: UpdateProductImagesDto,
    ) {
        try {
            this.logger.log(`Updating images on product pending update ${id}`);

            const desired = await this.resolveProductImages(data.images);
            const desiredUrls = new Set(desired.map((image) => image.image_url));
            if (desiredUrls.size !== desired.length) {
                throw new BadRequestException(
                    'Duplicate image URLs are not allowed',
                );
            }

            const result = await this.productRepository.updatePendingUpdate(
                id,
                { images: desired },
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
                    'Product already has a pending update',
                );
            }

            const { previousImages, currentImageUrls, pendingUpdate } = result;
            const nextUrls = new Set(desired.map((image) => image.image_url));
            const liveUrls = new Set(currentImageUrls);
            const orphaned = (previousImages ?? [])
                .map((image) => image.image_url)
                .filter(
                    (url) => !nextUrls.has(url) && !liveUrls.has(url),
                );
            await this.safeDeleteProductImages(orphaned);

            this.logger.log(
                `Product pending update ${id} images updated`,
            );
            return pendingUpdate;
        } catch (error) {
            this.handleError(error, 'Pending update not found');
        }
    }

    async approvePendingUpdates(pendingUpdateIds: string[]): Promise<void> {
        try {
            this.logger.log(
                `Approving ${pendingUpdateIds.length} product pending update(s)`,
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
                        update.status !== ProductPendingUpdateStatus.PENDING,
                )
            ) {
                throw new BadRequestException(
                    'Only pending updates can be approved',
                );
            }

            const removedImages =
                await this.productRepository.approvePendingUpdates(
                    pendingUpdates,
                );
            await this.safeDeleteProductImages(
                removedImages.map((image) => image.image_url),
            );
            this.logger.log(
                `Approved ${pendingUpdateIds.length} product pending update(s)`,
            );
        } catch (error) {
            this.handleError(error, 'Pending update not found');
        }
    }

    async rejectPendingUpdates(pendingUpdateIds: string[]): Promise<void> {
        try {
            this.logger.log(
                `Rejecting ${pendingUpdateIds.length} product pending update(s)`,
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
                        update.status !== ProductPendingUpdateStatus.PENDING,
                )
            ) {
                throw new BadRequestException(
                    'Only pending updates can be rejected',
                );
            }

            await this.productRepository.rejectPendingUpdates(pendingUpdateIds);

            const proposedOnlyUrls = pendingUpdates.flatMap((update) => {
                const liveUrls = new Set(update.current_image_urls);
                return (update.images ?? [])
                    .map((image) => image.image_url)
                    .filter((url) => !liveUrls.has(url));
            });
            await this.safeDeleteProductImages(proposedOnlyUrls);

            this.logger.log(
                `Rejected ${pendingUpdateIds.length} product pending update(s)`,
            );
        } catch (error) {
            this.handleError(error, 'Pending update not found');
        }
    }

    async updateImages(productId: string, data: UpdateProductImagesDto) {
        try {
            this.logger.log(
                `Proposing image update for product ${productId}`,
            );

            const desired = await this.resolveProductImages(data.images);
            const desiredUrls = new Set(desired.map((image) => image.image_url));
            if (desiredUrls.size !== desired.length) {
                throw new BadRequestException(
                    'Duplicate image URLs are not allowed',
                );
            }

            const pending =
                await this.productRepository.findPendingUpdateForProduct(
                    productId,
                );
            if (pending) {
                throw new ConflictException(
                    'Product already has a pending update',
                );
            }

            const proposal = await this.productRepository.createPendingUpdate(
                productId,
                { images: desired },
            );
            this.logger.log(
                `Pending update ${proposal.id} created for product ${productId} images`,
            );
            return proposal;
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
                    'Product is already archived. Cannot be archived from its current status.',
                );
            }
            const product = await this.productRepository.archiveProduct(id);
            this.logger.log(`Product archived ${id}`);
            return product;
        } catch (error) {
            this.handleError(error);
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
