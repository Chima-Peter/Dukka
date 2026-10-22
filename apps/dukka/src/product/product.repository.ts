import { Injectable, NotFoundException } from '@nestjs/common';
import {
    Prisma,
    ProductStatus,
    type Product,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { FindProductsDto } from './dto/find-products.dto.js';
import type { FindStaffProductsDto } from './dto/find-staff-products.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import type { UpdateVariantDto } from './dto/update-variant.dto.js';
import {
    productDetailSelect,
    productDetailWithMarketSelect,
    productListSummarySelect,
    toProductDetail,
    toProductListItem,
} from './mappers/product.mapper.js';
import type { CreateProductRecord } from './types/product.type.js';

@Injectable()
export class ProductRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateProductRecord) {
        return await this.prisma.product.create({
            data: {
                name: data.name,
                description: data.description,
                specs: data.specs as Prisma.InputJsonValue,
                market_category: {
                    connect: { id: data.market_category_id },
                },
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
            select: productDetailSelect,
        }).then(toProductDetail);
    }

    async findAllPublic(query: FindProductsDto) {
        const nameMatchedIds = await this.findNameMatchedIds(query.name);
        if (nameMatchedIds !== undefined && nameMatchedIds.length === 0) {
            return { items: [], next_cursor: null };
        }

        const limit = query.limit ?? 50;
        const hasPriceFilter =
            query.min_price !== undefined || query.max_price !== undefined;
        const records = await this.prisma.product.findMany({
            where: {
                ...(nameMatchedIds !== undefined && {
                    id: { in: nameMatchedIds },
                }),
                ...(query.market_category_id !== undefined && {
                    market_category_id: query.market_category_id,
                }),
                market_category: {
                    market_id: query.market_id,
                },
                status: ProductStatus.ACTIVE,
                variants: {
                    some: {
                        market_variants: {
                            some: {
                                market_id: query.market_id,
                                ...(hasPriceFilter && {
                                    price: {
                                        ...(query.min_price !== undefined && {
                                            gte: query.min_price,
                                        }),
                                        ...(query.max_price !== undefined && {
                                            lte: query.max_price,
                                        }),
                                    },
                                }),
                            },
                        },
                    },
                },
            },
            select: productListSummarySelect(query.market_id),
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
        });

        const hasMore = records.length > limit;
        const page = hasMore ? records.slice(0, limit) : records;
        const items = page.map(toProductListItem);

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1].id : null,
        };
    }

    async findAll(query: FindStaffProductsDto) {
        const nameMatchedIds = await this.findNameMatchedIds(query.name);
        if (nameMatchedIds !== undefined && nameMatchedIds.length === 0) {
            return { items: [], next_cursor: null };
        }

        const limit = query.limit ?? 50;
        const hasPriceFilter =
            query.min_price !== undefined || query.max_price !== undefined;
        const records = await this.prisma.product.findMany({
            where: {
                ...(nameMatchedIds !== undefined && {
                    id: { in: nameMatchedIds },
                }),
                ...(query.market_category_id !== undefined && {
                    market_category_id: query.market_category_id,
                }),
                ...(query.market_id !== undefined && {
                    market_category: {
                        market_id: query.market_id,
                    },
                }),
                ...(query.status !== undefined && { status: query.status }),
                ...(query.market_id !== undefined || hasPriceFilter
                    ? {
                          variants: {
                              some: {
                                  market_variants: {
                                      some: {
                                          ...(query.market_id !==
                                              undefined && {
                                              market_id: query.market_id,
                                          }),
                                          ...(hasPriceFilter && {
                                              price: {
                                                  ...(query.min_price !==
                                                      undefined && {
                                                      gte: query.min_price,
                                                  }),
                                                  ...(query.max_price !==
                                                      undefined && {
                                                      lte: query.max_price,
                                                  }),
                                              },
                                          }),
                                      },
                                  },
                              },
                          },
                      }
                    : {}),
            },
            select: productListSummarySelect(query.market_id),
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
        });

        const hasMore = records.length > limit;
        const page = hasMore ? records.slice(0, limit) : records;
        const items = page.map(toProductListItem);

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1].id : null,
        };
    }

    async findById(id: string) {
        return await this.prisma.product.findUnique({
            where: { id },
            select: { id: true, status: true },
        });
    }

    async findByIdOrThrow(id: string) {
        const product = await this.findById(id);
        if (!product) {
            throw new NotFoundException('Product not found');
        }
        return product;
    }

    async findDetailedById(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            select: productDetailSelect,
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        return toProductDetail(product);
    }

    async findByIdInMarket(
        id: string,
        marketId: string,
        status?: ProductStatus,
    ) {
        const product = await this.prisma.product.findFirst({
            where: {
                id,
                ...(status !== undefined && { status }),
                variants: {
                    some: {
                        market_variants: {
                            some: { market_id: marketId },
                        },
                    },
                },
            },
            select: productDetailWithMarketSelect(marketId),
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        return toProductDetail(product);
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

    async update(id: string, data: UpdateProductDto): Promise<Product> {
        const updateData: Prisma.ProductUpdateInput = {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.description !== undefined && {
                description: data.description,
            }),
            ...(data.specs !== undefined && {
                specs: data.specs as Prisma.InputJsonValue,
            }),
            ...(data.market_category_id !== undefined && {
                market_category: {
                    connect: { id: data.market_category_id },
                },
            }),
        };

        return await this.prisma.product.update({
            where: { id },
            data: updateData,
        });
    }

    async syncProductImages(
        productId: string,
        desired: { image_url: string; sort_order: number }[],
    ) {
        return await this.prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({
                where: { id: productId },
                select: { id: true },
            });
            if (!product) {
                throw new NotFoundException('Product not found');
            }

            const existing = await tx.productImage.findMany({
                where: { product_id: productId },
                select: {
                    id: true,
                    image_url: true,
                    sort_order: true,
                },
            });

            const desiredByUrl = new Map(
                desired.map((image) => [image.image_url, image]),
            );
            const existingByUrl = new Map(
                existing.map((image) => [image.image_url, image]),
            );

            const toDelete = existing.filter(
                (image) => !desiredByUrl.has(image.image_url),
            );
            if (toDelete.length > 0) {
                await tx.productImage.deleteMany({
                    where: {
                        id: { in: toDelete.map((image) => image.id) },
                    },
                });
            }

            await Promise.all(
                desired.map((image) => {
                    const current = existingByUrl.get(image.image_url);
                    if (!current) {
                        return tx.productImage.create({
                            data: {
                                product: { connect: { id: productId } },
                                image_url: image.image_url,
                                sort_order: image.sort_order,
                            },
                        });
                    }

                    if (current.sort_order !== image.sort_order) {
                        return tx.productImage.update({
                            where: { id: current.id },
                            data: { sort_order: image.sort_order },
                        });
                    }

                    return undefined;
                }),
            );

            return toDelete;
        });
    }

    async updateStatus(id: string, status: ProductStatus): Promise<Product> {
        return await this.prisma.product.update({
            where: { id },
            data: { status },
        });
    }

    async createVariant(
        productId: string,
        data: {
            variant_code: string;
            color?: string;
            size?: string;
            variant_info: Record<string, unknown>;
            image_url?: string;
        },
    ) {
        return await this.prisma.variant.create({
            data: {
                product: { connect: { id: productId } },
                variant_code: data.variant_code,
                color: data.color,
                size: data.size,
                variant_info: data.variant_info as Prisma.InputJsonValue,
                ...(data.image_url !== undefined && {
                    image: {
                        create: { image_url: data.image_url },
                    },
                }),
            },
            select: {
                id: true,
                variant_code: true,
                color: true,
                size: true,
                variant_info: true,
                created_at: true,
                updated_at: true,
                image: {
                    select: {
                        image_url: true,
                    },
                },
            },
        });
    }

    async updateVariant(
        productId: string,
        variantId: string,
        data: UpdateVariantDto & { image_url?: string },
    ) {
        const updateData: Prisma.VariantUpdateInput = {
            ...(data.variant_code !== undefined && {
                variant_code: data.variant_code,
            }),
            ...(data.color !== undefined && { color: data.color }),
            ...(data.size !== undefined && { size: data.size }),
            ...(data.variant_info !== undefined && {
                variant_info: data.variant_info as Prisma.InputJsonValue,
            }),
            ...(data.image_url !== undefined && {
                image: {
                    upsert: {
                        create: { image_url: data.image_url },
                        update: { image_url: data.image_url },
                    },
                },
            }),
        };

        return await this.prisma.variant.update({
            where: {
                id: variantId,
                product_id: productId,
            },
            data: updateData,
            select: {
                id: true,
                variant_code: true,
                color: true,
                size: true,
                variant_info: true,
                created_at: true,
                updated_at: true,
                image: {
                    select: {
                        image_url: true,
                    },
                },
            },
        });
    }

    async findVariantInProduct(productId: string, variantId: string) {
        return await this.prisma.variant.findFirst({
            where: {
                id: variantId,
                product_id: productId,
            },
            select: {
                id: true,
                image: {
                    select: {
                        image_url: true,
                    },
                },
            },
        });
    }

    async findVariantById(variantId: string) {
        return await this.prisma.variant.findUnique({
            where: { id: variantId },
            select: {
                id: true,
                product_id: true,
            },
        });
    }

    async findVariantByIdOrThrow(variantId: string) {
        const variant = await this.findVariantById(variantId);
        if (!variant) {
            throw new NotFoundException('Variant not found');
        }
        return variant;
    }

    async findMarketVariantById(marketVariantId: string) {
        return await this.prisma.marketVariant.findUnique({
            where: { id: marketVariantId },
            select: {
                id: true,
                market_id: true,
                variant_id: true,
                variant: {
                    select: {
                        id: true,
                        product_id: true,
                    },
                },
            },
        });
    }

    async findMarketVariantByIdOrThrow(marketVariantId: string) {
        const marketVariant = await this.findMarketVariantById(marketVariantId);
        if (!marketVariant) {
            throw new NotFoundException('Market variant not found');
        }
        return marketVariant;
    }

    async findMarketVariantsByIds(marketVariantIds: string[]) {
        if (marketVariantIds.length === 0) {
            return [];
        }

        return await this.prisma.marketVariant.findMany({
            where: { id: { in: marketVariantIds } },
            select: {
                id: true,
                market_id: true,
                variant_id: true,
                variant: {
                    select: {
                        id: true,
                        product_id: true,
                    },
                },
            },
        });
    }

    async createMarketVariant(data: {
        variant_id: string;
        market_id: string;
        price: number;
        currency: string;
    }) {
        return await this.prisma.marketVariant.create({
            data: {
                variant: {
                    connect: { id: data.variant_id },
                },
                market: {
                    connect: { id: data.market_id },
                },
                price: data.price,
                currency: data.currency,
            },
        });
    }

    async updateMarketVariant(
        variantId: string,
        marketId: string,
        price: number,
    ) {
        return await this.prisma.marketVariant.update({
            where: {
                market_id_variant_id: {
                    market_id: marketId,
                    variant_id: variantId,
                },
            },
            data: { price },
        });
    }

    async deleteMarketVariant(variantId: string, marketId: string) {
        return await this.prisma.marketVariant.delete({
            where: {
                market_id_variant_id: {
                    market_id: marketId,
                    variant_id: variantId,
                },
            },
        });
    }

    async findMarketVariant(
        productId: string,
        variantId: string,
        marketId: string,
        status?: ProductStatus,
    ) {
        return await this.prisma.marketVariant.findFirst({
            where: {
                market_id: marketId,
                variant_id: variantId,
                variant: {
                    product_id: productId,
                    ...(status !== undefined && {
                        product: { status },
                    }),
                },
            },
        });
    }
}
