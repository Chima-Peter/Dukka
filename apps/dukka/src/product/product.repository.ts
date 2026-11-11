import { Injectable, NotFoundException } from '@nestjs/common';
import {
    MarketVariantStatus,
    Prisma,
    ProductPendingUpdateStatus,
    ProductStatus,
    VariantStatus,
    type Product,
    PrismaService,
} from '@app/common';
import type { FindProductPendingUpdatesDto } from './dto/find-product-pending-updates.dto.js';
import type { FindProductsDto } from './dto/find-products.dto.js';
import type { FindStaffProductsDto } from './dto/find-staff-products.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import {
    parsePendingImages,
    toProductPendingUpdateCreatedView,
    toProductPendingUpdateDetailView,
    toProductPendingUpdateMutationView,
    toProductPendingUpdateSummary,
    productDetailSelect,
    productDetailWithMarketSelect,
    productListSummarySelect,
    productStaffDetailWithMarketSelect,
    toProductDetail,
    toProductListItem,
    toStaffProductDetail,
} from './mappers/product.mapper.js';
import type {
    CreateProductPendingUpdateData,
    CreateProductRecord,
    ProductImageRecord,
} from './types/product.type.js';

@Injectable()
export class ProductRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateProductRecord) {
        return await this.prisma.product.create({
            data: {
                name: data.name,
                description: data.description,
                specs: data.specs as Prisma.InputJsonValue,
                category: {
                    connect: { id: data.category_id },
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
        const limit = query.limit ?? 50;
        const nameQuery = query.name?.trim();
        const hasPriceFilter =
            query.min_price !== undefined || query.max_price !== undefined;
        const records = await this.prisma.product.findMany({
            where: {
                ...(nameQuery
                    ? {
                          name: {
                              contains: nameQuery,
                              mode: 'insensitive',
                          },
                      }
                    : {}),
                ...(query.category_id !== undefined && {
                    category_id: query.category_id,
                }),
                status: ProductStatus.ACTIVE,
                variants: {
                    some: {
                        status: VariantStatus.ACTIVE,
                        market_variants: {
                            some: {
                                status: MarketVariantStatus.ACTIVE,
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
            select: productListSummarySelect(
                query.market_id,
                undefined,
                MarketVariantStatus.ACTIVE,
                false,
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

    async findSuggestionsPublic(query: {
        market_id: string;
        q: string;
        limit: number;
    }) {
        const tokens = query.q
            .trim()
            .toLowerCase()
            .split(/[^a-z0-9]+/i)
            .filter(Boolean);
        if (!tokens.length) {
            return { items: [] };
        }

        const tsQuery = tokens
            .map((token, index) =>
                index === tokens.length - 1 ? `${token}:*` : token,
            )
            .join(' & ');

        const rows = await this.prisma.$queryRaw<
            {
                id: string;
                name: string;
                image_url: string | null;
                price: Prisma.Decimal | null;
                currency: string | null;
                sold_out: boolean;
            }[]
        >`
            SELECT
                ranked.id,
                ranked.name,
                ranked.image_url,
                ranked.price,
                ranked.currency,
                ranked.sold_out
            FROM (
                SELECT DISTINCT ON (p.id)
                    p.id,
                    p.name,
                    (
                        SELECT pi.image_url
                        FROM "dukka"."ProductImage" pi
                        WHERE pi.product_id = p.id
                        ORDER BY pi.sort_order ASC
                        LIMIT 1
                    ) AS image_url,
                    mv.price,
                    mv.currency,
                    mv.sold_out,
                    ts_rank(
                        to_tsvector('english', p.name),
                        to_tsquery('english', ${tsQuery})
                    ) AS rank
                FROM "dukka"."Product" p
                INNER JOIN "dukka"."Variant" v
                    ON v.product_id = p.id
                    AND v.status = 'ACTIVE'
                INNER JOIN "dukka"."MarketVariant" mv
                    ON mv.variant_id = v.id
                    AND mv.status = 'ACTIVE'
                    AND mv.market_id = ${query.market_id}
                INNER JOIN "dukka"."Market" m
                    ON m.id = mv.market_id
                    AND m.status = 'OPEN'
                WHERE p.status = 'ACTIVE'
                    AND to_tsvector('english', p.name)
                        @@ to_tsquery('english', ${tsQuery})
                ORDER BY p.id, v.created_at ASC, v.id ASC
            ) ranked
            ORDER BY ranked.rank DESC, ranked.name ASC
            LIMIT ${query.limit}
        `;

        return {
            items: rows.map((row) => ({
                id: row.id,
                name: row.name,
                image_url: row.image_url,
                price: row.price,
                currency: row.currency,
                sold_out: row.sold_out,
                promotion: null,
            })),
        };
    }

    async findAll(query: FindStaffProductsDto) {
        const limit = query.limit ?? 50;
        const nameQuery = query.name?.trim();
        const hasPriceFilter =
            query.min_price !== undefined || query.max_price !== undefined;
        const hasMarketVariantFilter =
            query.market_id !== undefined ||
            hasPriceFilter ||
            query.sold_out !== undefined ||
            query.market_variant_status !== undefined;
        const hasVariantFilter =
            hasMarketVariantFilter || query.variant_status !== undefined;
        const records = await this.prisma.product.findMany({
            where: {
                ...(nameQuery
                    ? {
                          name: {
                              contains: nameQuery,
                              mode: 'insensitive',
                          },
                      }
                    : {}),
                ...(query.category_id !== undefined && {
                    category_id: query.category_id,
                }),
                status: query.status ?? ProductStatus.ACTIVE,
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
                                              status:
                                                  query.market_variant_status ??
                                                  MarketVariantStatus.ACTIVE,
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
                query.market_variant_status ?? MarketVariantStatus.ACTIVE,
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
            select: { id: true, status: true, category_id: true },
        });
    }

    async findByIdOrThrow(id: string) {
        const product = await this.findById(id);
        if (!product) {
            throw new NotFoundException('Product not found');
        }
        return product;
    }

    async findDetailedById(id: string, marketId: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            select: productStaffDetailWithMarketSelect(marketId),
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        return toStaffProductDetail(product);
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
                                status: MarketVariantStatus.ACTIVE,
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

    async findMarketIdsByProductId(productId: string): Promise<string[]> {
        const rows = await this.prisma.marketVariant.findMany({
            where: { variant: { product_id: productId } },
            select: { market_id: true },
            distinct: ['market_id'],
        });
        return rows.map((row) => row.market_id);
    }

    async findMarketIdsByProductIds(productIds: string[]): Promise<string[]> {
        if (productIds.length === 0) {
            return [];
        }

        const rows = await this.prisma.marketVariant.findMany({
            where: { variant: { product_id: { in: productIds } } },
            select: { market_id: true },
            distinct: ['market_id'],
        });
        return rows.map((row) => row.market_id);
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
            ...(data.category_id !== undefined && {
                category: {
                    connect: { id: data.category_id },
                },
            }),
        };

        return await this.prisma.product.update({
            where: { id },
            data: updateData,
        });
    }

    async findPendingUpdateForProduct(productId: string) {
        return await this.prisma.productPendingUpdate.findFirst({
            where: {
                product_id: productId,
                status: ProductPendingUpdateStatus.PENDING,
            },
            select: { id: true },
        });
    }

    async createPendingUpdate(
        productId: string,
        data: CreateProductPendingUpdateData,
    ) {
        const created = await this.prisma.productPendingUpdate.create({
            data: {
                product: { connect: { id: productId } },
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
                ...(data.images !== undefined && {
                    images: data.images as unknown as Prisma.InputJsonValue,
                }),
            },
            select: {
                id: true,
                status: true,
                product_id: true,
                created_at: true,
                updated_at: true,
            },
        });
        return toProductPendingUpdateCreatedView(created);
    }

    async findPendingUpdatesByIds(pendingUpdateIds: string[]) {
        const records = await this.prisma.productPendingUpdate.findMany({
            where: {
                id: { in: pendingUpdateIds },
            },
            select: {
                id: true,
                status: true,
                name: true,
                description: true,
                specs: true,
                category_id: true,
                images: true,
                product_id: true,
                product: {
                    select: {
                        images: {
                            select: {
                                image_url: true,
                            },
                        },
                    },
                },
            },
        });

        return records.map(({ images, product, ...rest }) => ({
            ...rest,
            images: parsePendingImages(images),
            current_image_urls: product.images.map((image) => image.image_url),
        }));
    }

    async approvePendingUpdates(
        pendingUpdates: Array<{
            id: string;
            product_id: string;
            name: string | null;
            description: string | null;
            specs: Prisma.JsonValue | null;
            category_id: string | null;
            images: ProductImageRecord[] | null;
        }>,
    ): Promise<{ image_url: string }[]> {
        return await this.prisma.$transaction(async (tx) => {
            const removedImages: { image_url: string }[] = [];

            for (const update of pendingUpdates) {
                const updateData: Prisma.ProductUpdateInput = {
                    ...(update.name !== null && { name: update.name }),
                    ...(update.description !== null && {
                        description: update.description,
                    }),
                    ...(update.specs !== null && {
                        specs: update.specs as Prisma.InputJsonValue,
                    }),
                    ...(update.category_id !== null && {
                        category: {
                            connect: { id: update.category_id },
                        },
                    }),
                };

                await tx.product.update({
                    where: { id: update.product_id },
                    data: updateData,
                });

                if (update.images !== null) {
                    const removed = await this.syncProductImagesInTx(
                        tx,
                        update.product_id,
                        update.images,
                    );
                    removedImages.push(...removed);
                }

                await tx.productPendingUpdate.update({
                    where: { id: update.id },
                    data: { status: ProductPendingUpdateStatus.APPROVED },
                });
            }

            return removedImages;
        });
    }

    async rejectPendingUpdates(pendingUpdateIds: string[]): Promise<void> {
        await this.prisma.productPendingUpdate.updateMany({
            where: {
                id: { in: pendingUpdateIds },
                status: ProductPendingUpdateStatus.PENDING,
            },
            data: { status: ProductPendingUpdateStatus.REJECTED },
        });
    }

    async updatePendingUpdate(
        id: string,
        data: CreateProductPendingUpdateData,
    ) {
        return await this.prisma.$transaction(async (tx) => {
            const existing = await tx.productPendingUpdate.findUnique({
                where: { id },
                select: {
                    id: true,
                    status: true,
                    product_id: true,
                    images: true,
                },
            });
            if (!existing) {
                return { error: 'NOT_FOUND' as const };
            }
            if (
                existing.status !== ProductPendingUpdateStatus.PENDING &&
                existing.status !== ProductPendingUpdateStatus.REJECTED
            ) {
                return { error: 'INVALID_STATUS' as const };
            }

            if (existing.status === ProductPendingUpdateStatus.REJECTED) {
                const otherPending = await tx.productPendingUpdate.findFirst({
                    where: {
                        product_id: existing.product_id,
                        status: ProductPendingUpdateStatus.PENDING,
                        id: { not: id },
                    },
                    select: { id: true },
                });
                if (otherPending) {
                    return { error: 'CONFLICT' as const };
                }
            }

            const previousImages = parsePendingImages(existing.images);
            const liveImages = await tx.productImage.findMany({
                where: { product_id: existing.product_id },
                select: { image_url: true },
            });
            const pendingUpdate = await tx.productPendingUpdate.update({
                where: { id },
                data: {
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
                    ...(data.images !== undefined && {
                        images: data.images as unknown as Prisma.InputJsonValue,
                    }),
                    status: ProductPendingUpdateStatus.PENDING,
                },
                select: {
                    id: true,
                    status: true,
                    name: true,
                    description: true,
                    specs: true,
                    category_id: true,
                    images: true,
                    product_id: true,
                    created_at: true,
                    updated_at: true,
                },
            });

            return {
                previousImages,
                currentImageUrls: liveImages.map((image) => image.image_url),
                pendingUpdate: toProductPendingUpdateMutationView(pendingUpdate),
            };
        });
    }

    async findPendingUpdateById(id: string) {
        const record = await this.prisma.productPendingUpdate.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                name: true,
                description: true,
                specs: true,
                category_id: true,
                images: true,
                product_id: true,
                created_at: true,
                updated_at: true,
                product: {
                    select: {
                        name: true,
                        description: true,
                        specs: true,
                        status: true,
                        category_id: true,
                        images: {
                            select: {
                                image_url: true,
                                sort_order: true,
                            },
                            orderBy: { sort_order: 'asc' },
                        },
                    },
                },
            },
        });

        if (!record) {
            return null;
        }

        return toProductPendingUpdateDetailView(record);
    }

    async findPendingUpdatesSummary(query: FindProductPendingUpdatesDto) {
        const limit = query.limit ?? 50;
        const records = await this.prisma.productPendingUpdate.findMany({
            where: {
                ...(query.status !== undefined && { status: query.status }),
                ...((query.from_date !== undefined ||
                    query.to_date !== undefined) && {
                    created_at: {
                        ...(query.from_date !== undefined && {
                            gte: new Date(query.from_date),
                        }),
                        ...(query.to_date !== undefined && {
                            lte: new Date(query.to_date),
                        }),
                    },
                }),
            },
            select: {
                id: true,
                status: true,
                created_at: true,
                updated_at: true,
                product_id: true,
                product: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
        });

        const hasMore = records.length > limit;
        const page = hasMore ? records.slice(0, limit) : records;
        const items = page.map(toProductPendingUpdateSummary);

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1]!.id : null,
        };
    }

    async syncProductImages(
        productId: string,
        desired: ProductImageRecord[],
    ) {
        return await this.prisma.$transaction(async (tx) => {
            return await this.syncProductImagesInTx(tx, productId, desired);
        });
    }

    private async syncProductImagesInTx(
        tx: Prisma.TransactionClient,
        productId: string,
        desired: ProductImageRecord[],
    ) {
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
                await tx.marketVariant.updateMany({
                    where: {
                        variant_id: { in: variantIds },
                        status: { not: MarketVariantStatus.CLOSED },
                    },
                    data: { status: MarketVariantStatus.CLOSED },
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
