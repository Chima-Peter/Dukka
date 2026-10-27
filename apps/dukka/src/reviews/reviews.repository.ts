import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/common';
import type { FindReviewsDto } from './dto/find-reviews.dto.js';
import type { ReviewItem } from './types/review.type.js';

const reviewInclude = {
    review_images: {
        select: {
            id: true,
            image_url: true,
            created_at: true,
            updated_at: true,
        },
        orderBy: { created_at: 'asc' as const },
    },
};

@Injectable()
export class ReviewsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(
        customerId: string,
        data: {
            customer_name: string;
            market_variant_id: string;
            title: string;
            review: string;
            rating: number;
            image_urls?: string[];
        },
    ): Promise<ReviewItem> {
        return await this.prisma.reviews.create({
            data: {
                customer: {
                    connect: { id: customerId },
                },
                customer_name: data.customer_name,
                title: data.title,
                review: data.review,
                rating: data.rating,
                market_variant: {
                    connect: { id: data.market_variant_id },
                },
                ...(data.image_urls !== undefined &&
                    data.image_urls.length > 0 && {
                        review_images: {
                            create: data.image_urls.map((image_url) => ({
                                image_url,
                            })),
                        },
                    }),
            },
            include: reviewInclude,
        });
    }

    async findById(id: string): Promise<ReviewItem | null> {
        return await this.prisma.reviews.findUnique({
            where: { id },
            include: reviewInclude,
        });
    }

    async findAllByMarketVariant(query: FindReviewsDto) {
        const limit = query.limit ?? 50;
        const rows = await this.prisma.reviews.findMany({
            where: { market_variant_id: query.market_variant_id },
            include: reviewInclude,
            orderBy: [{ created_at: 'desc' }, { id: 'asc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
        });

        const hasMore = rows.length > limit;
        const items = hasMore ? rows.slice(0, limit) : rows;

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1].id : null,
        };
    }

    async delete(id: string): Promise<ReviewItem> {
        return await this.prisma.reviews.delete({
            where: { id },
            include: reviewInclude,
        });
    }

    async incrementLikes(
        id: string,
    ): Promise<{ id: string; likes: number | null; dislikes: number | null }> {
        return await this.prisma.reviews.update({
            where: { id },
            data: { likes: { increment: 1 } },
            select: { id: true, likes: true, dislikes: true },
        });
    }

    async incrementDislikes(
        id: string,
    ): Promise<{ id: string; likes: number | null; dislikes: number | null }> {
        return await this.prisma.reviews.update({
            where: { id },
            data: { dislikes: { increment: 1 } },
            select: { id: true, likes: true, dislikes: true },
        });
    }
}
