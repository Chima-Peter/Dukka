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
import { assertStaffHasMarkets } from '../shared/assert-staff-markets.js';
import type { CreateMarketVariantDto } from './dto/create-market-variant.dto.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { FindProductDto } from './dto/find-product.dto.js';
import type { FindProductsDto } from './dto/find-products.dto.js';
import type { FindStaffProductsDto } from './dto/find-staff-products.dto.js';
import type { UpdateMarketVariantDto } from './dto/update-market-variant.dto.js';
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

    async addVariantToMarket(
        productId: string,
        variantId: string,
        data: CreateMarketVariantDto,
        staffMarketIds: string[],
        accessToken?: string,
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

            assertStaffHasMarkets(staffMarketIds, [data.market_id]);
            const market = await this.fetchMarket(data.market_id, accessToken);
            if (!market.is_active) {
                throw new BadRequestException('Market is inactive');
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

    private async fetchMarket(
        marketId: string,
        accessToken?: string,
    ): Promise<{
        id: string;
        is_active: boolean;
        currency: { id: string; code: string; name: string };
    }> {
        if (!accessToken) {
            throw new UnauthorizedException('Missing authentication token');
        }

        try {
            const { data: body } = await this.accountHttp.get<
                ApiResponse<{
                    id: string;
                    is_active: boolean;
                    currency: { id: string; code: string; name: string };
                }>
            >('/markets/:id', {
                params: { id: marketId },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            });

            if (!body.success || !body.data) {
                throw new NotFoundException(
                    body.message ?? 'Market not found',
                );
            }

            return body.data;
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw toHttpException(error, { forward: [400, 403, 404] });
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
        return this.transitionStatus(
            id,
            ProductStatus.ARCHIVED,
            [ProductStatus.ACTIVE, ProductStatus.REJECTED, ProductStatus.PENDING_REVIEW],
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
                    'Referenced market category does not exist',
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
