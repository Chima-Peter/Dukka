import {
    BadRequestException,
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import {
    InjectHttpClient,
    toHttpException,
    type HttpClient,
} from '@nestjs/http-client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
    PRODUCT_BUCKET,
    SupabaseService,
    type ApiResponse,
} from '@app/common';
import {
    ProductStatus,
    type Product,
} from '../../generated/prisma/client.js';
import { ACCOUNT_HTTP_CLIENT } from '../shared/account-http.constants.js';
import type { AddToMarketDto } from './dto/add-to-market.dto.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { FindProductDto } from './dto/find-product.dto.js';
import type { FindProductsDto } from './dto/find-products.dto.js';
import type { FindStaffProductsDto } from './dto/find-staff-products.dto.js';
import type { SetMarketPriceDto } from './dto/set-market-price.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
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
        @InjectHttpClient(ACCOUNT_HTTP_CLIENT)
        private readonly accountHttp: HttpClient,
    ) {}

    async getImageUploadURLs(
        staffId: string,
        data: UploadFileDto,
    ): Promise<ImageUploadUrls> {
        try {
            this.logger.log(
                `Generating upload URLs for staff ${staffId}: ${data.product_images.length} product image(s), ${data.variant_images.length} variant image(s)`,
            );
            const [product_images, variant_images] = await Promise.all([
                this.createUploadMap(staffId, data.product_images),
                this.createUploadMap(staffId, data.variant_images),
            ]);
            return { product_images, variant_images };
        } catch (error) {
            this.handleError(error);
        }
    }

    private async createUploadMap(
        staffId: string,
        names: string[],
    ): Promise<Record<string, SignedUpload>> {
        const entries = await Promise.all(
            names.map(async (name) => {
                const upload = await this.supabaseService.createSignedUploadUrl(
                    staffId,
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

    async findAll(query: FindProductsDto) {
        try {
            this.logger.log('Fetching products');
            this.assertPriceRange(query.min_price, query.max_price);
            const page = await this.productRepository.findAllPublic(query);
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

    async findOne(id: string, query: FindProductDto) {
        try {
            this.logger.log(
                `Fetching product ${id} for market ${query.market_id}`,
            );
            return await this.productRepository.findByIdInMarket(
                id,
                query.market_id,
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

    async updateVariant(
        productId: string,
        variantId: string,
        data: UpdateVariantDto,
    ) {
        try {
            this.logger.log(
                `Updating variant ${variantId} on product ${productId}`,
            );
            const variant = await this.productRepository.updateVariant(
                productId,
                variantId,
                data,
            );
            this.logger.log(`Variant updated ${variantId}`);
            return variant;
        } catch (error) {
            this.handleError(error, 'Variant not found');
        }
    }

    async addToMarket(
        productId: string,
        data: AddToMarketDto,
        accessToken?: string,
    ) {
        try {
            this.logger.log(
                `Adding product ${productId} to ${data.market_ids.length} market(s)`,
            );
            const product = await this.productRepository.findById(productId);
            if (!product) {
                throw new NotFoundException('Product not found');
            }
            if (product.status !== ProductStatus.ACTIVE) {
                throw new BadRequestException(
                    'Only approved products can be added to a market',
                );
            }
            await this.assertMarketsValid(data.market_ids, accessToken);
            const marketProducts = await this.productRepository.addToMarkets(
                productId,
                data.market_ids,
            );
            this.logger.log(
                `Product ${productId} added to ${marketProducts.length} market(s)`,
            );
            return marketProducts;
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException(
                    'Product is already in one or more of these markets',
                );
            }
            this.handleError(error);
        }
    }

    private async assertMarketsValid(
        marketIds: string[],
        accessToken?: string,
    ): Promise<void> {
        if (!accessToken) {
            throw new UnauthorizedException('Missing authentication token');
        }

        try {
            const { data: body } = await this.accountHttp.post<
                ApiResponse<{ valid: boolean; invalid_ids: string[] }>
            >('/markets/validate', {
                json: { market_ids: marketIds },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            });

            if (!body.success || !body.data?.valid) {
                const invalidIds = body.data?.invalid_ids ?? [];
                throw new BadRequestException({
                    message:
                        invalidIds.length > 0
                            ? `Invalid or inactive market id(s): ${invalidIds.join(', ')}`
                            : (body.message ??
                              'One or more market ids are invalid'),
                    invalid_ids: invalidIds,
                });
            }
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw toHttpException(error, { forward: [400, 404] });
        }
    }

    async setMarketPrice(
        productId: string,
        variantId: string,
        data: SetMarketPriceDto,
    ) {
        try {
            this.logger.log(
                `Setting market price for variant ${variantId} in market ${data.market_id}`,
            );
            const variant = await this.productRepository.findVariantInProduct(
                productId,
                variantId,
            );
            if (!variant) {
                throw new NotFoundException('Variant not found');
            }
            const marketPrice = await this.productRepository.setMarketPrice(
                variantId,
                data,
            );
            this.logger.log(
                `Market price set for variant ${variantId} in market ${data.market_id}`,
            );
            return marketPrice;
        } catch (error) {
            this.handleError(error, 'Variant not found');
        }
    }

    async getMarketPrice(
        productId: string,
        variantId: string,
        query: FindProductDto,
    ) {
        try {
            this.logger.log(
                `Fetching market price for variant ${variantId} in market ${query.market_id}`,
            );
            const marketPrice = await this.productRepository.findMarketPrice(
                productId,
                variantId,
                query.market_id,
                ProductStatus.ACTIVE,
            );
            if (!marketPrice) {
                throw new NotFoundException('Market price not found');
            }
            return marketPrice;
        } catch (error) {
            this.handleError(error, 'Market price not found');
        }
    }

    async approve(id: string): Promise<Product> {
        return this.transitionStatus(
            id,
            ProductStatus.ACTIVE,
            [ProductStatus.DRAFT],
            'Only draft products can be approved',
            'Approving',
            'approved',
        );
    }

    async reject(id: string): Promise<Product> {
        return this.transitionStatus(
            id,
            ProductStatus.REJECTED,
            [ProductStatus.DRAFT],
            'Only draft products can be rejected',
            'Rejecting',
            'rejected',
        );
    }

    async archive(id: string): Promise<Product> {
        return this.transitionStatus(
            id,
            ProductStatus.ARCHIVED,
            [ProductStatus.ACTIVE, ProductStatus.REJECTED, ProductStatus.DRAFT],
            'Product is already archived or cannot be archived from its current status',
            'Archiving',
            'archived',
        );
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
            if (error.code === 'P2003') {
                this.logger.warn(
                    `Foreign key constraint on product: ${error.message}`,
                );
                throw new ConflictException(
                    'Referenced category does not exist',
                );
            }
            if (error.code === 'P2025') {
                throw new NotFoundException(notFoundMessage);
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
