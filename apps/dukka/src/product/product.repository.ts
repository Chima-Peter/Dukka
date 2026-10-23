import { Injectable, NotFoundException } from '@nestjs/common';
import {
    Prisma,
    ProductStatus,
    VariantStatus,
    type Product,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { FindProductsDto } from './dto/find-products.dto.js';
import type { FindStaffProductsDto } from './dto/find-staff-products.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
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

    async findAllPublic(query: FindProductsDto & { market_id: string }) {
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
                    market: {
                        id: query.market_id,
                        status: 'OPEN',
                    },
                },
                status: ProductStatus.ACTIVE,
                variants: {
                    some: {
                        status: VariantStatus.ACTIVE,
                        market_variants: {
                            some: {
                                market: {
                                    id: query.market_id,
                                    status: 'OPEN',
                                },
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
        const hasMarketVariantFilter =
            query.market_id !== undefined ||
            hasPriceFilter ||
            query.sold_out !== undefined;
        const hasVariantFilter =
            hasMarketVariantFilter || query.variant_status !== undefined;
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
                ...(hasVariantFilter
                    ? {
                          variants: {
                              some: {
                                  ...(query.variant_status !== undefined && {
                                      status: query.variant_status,
                                  }),
                                  ...(hasMarketVariantFilter && {
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
                                              ...(query.sold_out !==
                                                  undefined && {
                                                  sold_out: query.sold_out,
                                              }),
                                          },
                                      },
                                  }),
                              },
                          },
                      }
                    : {}),
            },
            select: productListSummarySelect(
                query.market_id,
                query.variant_status,
            ),
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
                        status: VariantStatus.ACTIVE,
                        market_variants: {
                            some: {
                                market: { id: marketId, status: 'OPEN' },
                            },
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

    async archiveProduct(id: string): Promise<Product> {
        return await this.prisma.$transaction(async (tx) => {
            const variants = await tx.variant.findMany({
                where: {
                    product_id: id,
                    status: { not: VariantStatus.ARCHIVED },
                },
                select: { id: true },
            });
            const variantIds = variants.map((variant) => variant.id);

            if (variantIds.length > 0) {
                await tx.marketVariant.deleteMany({
                    where: { variant_id: { in: variantIds } },
                });
                await tx.variant.updateMany({
                    where: { id: { in: variantIds } },
                    data: { status: VariantStatus.ARCHIVED },
                });
            }

            return await tx.product.update({
                where: { id },
                data: { status: ProductStatus.ARCHIVED },
            });
        });
    }
}
