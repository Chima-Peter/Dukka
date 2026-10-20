import { Injectable, NotFoundException } from '@nestjs/common';
import {
    Prisma,
    ProductStatus,
    type Product,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { FindAdminProductsDto } from './dto/find-admin-products.dto.js';
import type { FindProductsDto } from './dto/find-products.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import type { UpdateVariantDto } from './dto/update-variant.dto.js';

export type CreateProductRecord = {
    name: string;
    description: string;
    specs: Record<string, unknown>;
    category_id: string;
    images: {
        image_url: string;
        sort_order: number;
    }[];
    variants: {
        variant_code: string;
        color?: string;
        size?: string;
        variant_info: Record<string, unknown>;
        image_url?: string;
    }[];
};

const productDetailInclude = {
    images: {
        orderBy: { sort_order: 'asc' as const },
    },
    variants: {
        include: { image: true },
    },
} as const;

@Injectable()
export class ProductRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateProductRecord) {
        return await this.prisma.product.create({
            data: {
                name: data.name,
                description: data.description,
                specs: data.specs as Prisma.InputJsonValue,
                category_id: data.category_id,
                images: {
                    create: data.images.map((image) => ({
                        image_url: image.image_url,
                        sort_order: image.sort_order,
                    })),
                },
                variants: {
                    create: data.variants.map((variant) => ({
                        variant_code: variant.variant_code,
                        color: variant.color,
                        size: variant.size,
                        variant_info:
                            variant.variant_info as Prisma.InputJsonValue,
                        ...(variant.image_url !== undefined && {
                            image: {
                                create: { image_url: variant.image_url },
                            },
                        }),
                    })),
                },
            },
            include: productDetailInclude,
        });
    }

    async findAllPublic(query: FindProductsDto) {
        const nameMatchedIds = await this.findNameMatchedIds(query.name);
        if (nameMatchedIds !== undefined && nameMatchedIds.length === 0) {
            return { items: [], next_cursor: null };
        }

        const limit = query.limit ?? 50;
        const records = await this.prisma.marketProduct.findMany({
            where: {
                market_id: query.market_id,
                product: this.buildProductFilters(
                    query,
                    nameMatchedIds,
                    ProductStatus.ACTIVE,
                ),
            },
            include: {
                product: {
                    include: productDetailInclude,
                },
            },
            orderBy: [{ created_at: 'desc' }, { product_id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: {
                    market_id_product_id: {
                        market_id: query.market_id,
                        product_id: query.cursor,
                    },
                },
                skip: 1,
            }),
        });

        const hasMore = records.length > limit;
        const page = hasMore ? records.slice(0, limit) : records;
        const items = page.map((record) => record.product);

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1].id : null,
        };
    }

    async findAll(query: FindAdminProductsDto) {
        const nameMatchedIds = await this.findNameMatchedIds(query.name);
        if (nameMatchedIds !== undefined && nameMatchedIds.length === 0) {
            return { items: [], next_cursor: null };
        }

        const limit = query.limit ?? 50;
        const records = await this.prisma.product.findMany({
            where: {
                market: {
                    some: { market_id: query.market_id },
                },
                ...this.buildProductFilters(
                    query,
                    nameMatchedIds,
                    query.status,
                ),
            },
            include: productDetailInclude,
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
        });

        const hasMore = records.length > limit;
        const items = hasMore ? records.slice(0, limit) : records;

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1].id : null,
        };
    }

    async findById(id: string) {
        return await this.prisma.product.findUnique({
            where: { id },
            include: productDetailInclude,
        });
    }

    async findByIdInMarket(
        id: string,
        marketId: string,
        status?: ProductStatus,
    ) {
        const marketProduct = await this.prisma.marketProduct.findFirst({
            where: {
                market_id: marketId,
                product_id: id,
                ...(status !== undefined && {
                    product: { status },
                }),
            },
            include: {
                product: {
                    include: productDetailInclude,
                },
            },
        });

        if (!marketProduct) {
            throw new NotFoundException('Product not found');
        }

        return marketProduct.product;
    }

    private async findNameMatchedIds(name?: string) {
        const nameQuery = name?.trim();
        if (!nameQuery) {
            return undefined;
        }

        const rows = await this.prisma.$queryRaw<{ id: string }[]>`
            SELECT id
            FROM "Product"
            WHERE to_tsvector('english', name)
                @@ websearch_to_tsquery('english', ${nameQuery})
        `;
        return rows.map((row) => row.id);
    }

    private buildProductFilters(
        query: FindProductsDto | FindAdminProductsDto,
        nameMatchedIds: string[] | undefined,
        status?: ProductStatus,
    ): Prisma.ProductWhereInput {
        const hasPriceFilter =
            query.min_price !== undefined || query.max_price !== undefined;

        return {
            ...(nameMatchedIds !== undefined && {
                id: { in: nameMatchedIds },
            }),
            ...(query.category_id !== undefined && {
                category_id: query.category_id,
            }),
            ...(status !== undefined && { status }),
            ...(hasPriceFilter && {
                variants: {
                    some: {
                        market_price: {
                            some: {
                                market_id: query.market_id,
                                price: {
                                    ...(query.min_price !== undefined && {
                                        gte: query.min_price,
                                    }),
                                    ...(query.max_price !== undefined && {
                                        lte: query.max_price,
                                    }),
                                },
                            },
                        },
                    },
                },
            }),
        };
    }

    async update(id: string, data: UpdateProductDto): Promise<Product> {
        const updateData: Prisma.ProductUncheckedUpdateInput = {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.description !== undefined && {
                description: data.description,
            }),
            ...(data.specs !== undefined && {
                specs: data.specs as Prisma.InputJsonValue,
            }),
            ...(data.category_id !== undefined && {
                category_id: data.category_id,
            }),
        };

        return await this.prisma.product.update({
            where: { id },
            data: updateData,
        });
    }

    async updateStatus(id: string, status: ProductStatus): Promise<Product> {
        return await this.prisma.product.update({
            where: { id },
            data: { status },
        });
    }

    async updateVariant(
        productId: string,
        variantId: string,
        data: UpdateVariantDto,
    ) {
        const updateData: Prisma.VariantUncheckedUpdateInput = {
            ...(data.variant_code !== undefined && {
                variant_code: data.variant_code,
            }),
            ...(data.color !== undefined && { color: data.color }),
            ...(data.size !== undefined && { size: data.size }),
            ...(data.variant_info !== undefined && {
                variant_info: data.variant_info as Prisma.InputJsonValue,
            }),
        };

        return await this.prisma.variant.update({
            where: {
                id: variantId,
                product_id: productId,
            },
            data: updateData,
        });
    }

    async findVariantInProduct(productId: string, variantId: string) {
        return await this.prisma.variant.findFirst({
            where: {
                id: variantId,
                product_id: productId,
            },
        });
    }

    async addToMarkets(productId: string, marketIds: string[]) {
        return await this.prisma.marketProduct.createManyAndReturn({
            data: marketIds.map((marketId) => ({
                product_id: productId,
                market_id: marketId,
            })),
        });
    }

    async setMarketPrice(
        variantId: string,
        data: { market_id: string; price: number; currency: string },
    ) {
        return await this.prisma.marketPrice.upsert({
            where: {
                market_id_variant_id: {
                    market_id: data.market_id,
                    variant_id: variantId,
                },
            },
            create: {
                market_id: data.market_id,
                variant_id: variantId,
                price: data.price,
                currency: data.currency,
            },
            update: {
                price: data.price,
                currency: data.currency,
            },
        });
    }

    async findMarketPrice(
        productId: string,
        variantId: string,
        marketId: string,
        status?: ProductStatus,
    ) {
        return await this.prisma.marketPrice.findFirst({
            where: {
                market_id: marketId,
                variant_id: variantId,
                variant: {
                    product_id: productId,
                    product: {
                        ...(status !== undefined && { status }),
                        market: {
                            some: { market_id: marketId },
                        },
                    },
                },
            },
        });
    }
}
