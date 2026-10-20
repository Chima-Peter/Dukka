import { Injectable, NotFoundException } from '@nestjs/common';
import {
    Prisma,
    ProductStatus,
    WarehouseStatus,
    type Product,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { FindProductsDto } from './dto/find-products.dto.js';
import type { FindStaffProductsDto } from './dto/find-staff-products.dto.js';
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

function productListSummarySelect(marketId?: string) {
    return {
        id: true,
        name: true,
        description: true,
        status: true,
        category_id: true,
        created_at: true,
        updated_at: true,
        images: {
            orderBy: { sort_order: 'asc' as const },
            take: 1,
            select: {
                id: true,
                image_url: true,
                sort_order: true,
            },
        },
        variants: {
            ...(marketId !== undefined && {
                where: {
                    market_variants: {
                        some: { market_id: marketId },
                    },
                },
            }),
            orderBy: [{ created_at: 'asc' as const }, { id: 'asc' as const }],
            take: 1,
            select: {
                id: true,
                market_variants: {
                    ...(marketId !== undefined && {
                        where: { market_id: marketId },
                    }),
                    take: 1,
                    select: {
                        price: true,
                        currency: true,
                    },
                },
            },
        },
    } satisfies Prisma.ProductSelect;
}

function withFirstVariantPrice<
    T extends {
        variants: Array<{
            market_variants: Array<{
                price: unknown;
                currency: string;
            }>;
        }>;
    },
>(product: T) {
    const { variants, ...rest } = product;
    const marketVariant = variants[0]?.market_variants[0];
    return {
        ...rest,
        price: marketVariant?.price ?? null,
        currency: marketVariant?.currency ?? null,
    };
}

const productDetailInclude = {
    images: {
        orderBy: { sort_order: 'asc' as const },
    },
    variants: {
        include: { image: true },
    },
} as const;

function productDetailWithMarketVariantsInclude(marketId?: string) {
    return {
        images: {
            orderBy: { sort_order: 'asc' as const },
        },
        variants: {
            include: {
                image: true,
                market_variants: {
                    ...(marketId !== undefined && {
                        where: { market_id: marketId },
                    }),
                    include: {
                        inventories: {
                            ...(marketId !== undefined && {
                                where: {
                                    warehouse: {
                                        market_id: marketId,
                                        status: WarehouseStatus.OPEN,
                                    },
                                },
                            }),
                            select: {
                                available_quantity: true,
                            },
                        },
                    },
                },
            },
        },
    } as const;
}

function withMarketVariantAvailability<
    T extends {
        variants: Array<{
            market_variants: Array<{
                inventories: Array<{ available_quantity: number }>;
            }>;
        }>;
    },
>(product: T) {
    return {
        ...product,
        variants: product.variants.map(({ market_variants, ...variant }) => {
            const available_quantity = market_variants.reduce(
                (variantSum, marketVariant) =>
                    variantSum +
                    marketVariant.inventories.reduce(
                        (sum, row) => sum + row.available_quantity,
                        0,
                    ),
                0,
            );

            return {
                ...variant,
                available_quantity,
                market_variants: market_variants.map(
                    ({ inventories, ...marketVariant }) => ({
                        ...marketVariant,
                        available_quantity: inventories.reduce(
                            (sum, row) => sum + row.available_quantity,
                            0,
                        ),
                    }),
                ),
            };
        }),
    };
}

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
            include: productDetailInclude,
        });
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
                ...(query.category_id !== undefined && {
                    category_id: query.category_id,
                }),
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
        const items = page.map(withFirstVariantPrice);

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
                ...(query.category_id !== undefined && {
                    category_id: query.category_id,
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
        const items = page.map(withFirstVariantPrice);

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
            include: productDetailWithMarketVariantsInclude(),
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        return withMarketVariantAvailability(product);
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
            include: productDetailWithMarketVariantsInclude(marketId),
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        return withMarketVariantAvailability(product);
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
                market_id: data.market_id,
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
