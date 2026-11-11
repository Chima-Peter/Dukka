import type { Prisma } from '@app/common';
import type { ReviewItem, ReviewSummary } from '../types/review.type.js';

export const reviewItemInclude = {
    review_images: {
        select: {
            id: true,
            image_url: true,
            created_at: true,
            updated_at: true,
        },
        orderBy: { created_at: 'asc' as const },
    },
} satisfies Prisma.ReviewsInclude;

export const reviewSummarySelect = {
    id: true,
    customer_name: true,
    title: true,
    review: true,
    rating: true,
    created_at: true,
    review_images: {
        select: {
            image_url: true,
        },
        orderBy: { created_at: 'asc' as const },
        take: 1,
    },
} satisfies Prisma.ReviewsSelect;

type ReviewItemRow = Prisma.ReviewsGetPayload<{
    include: typeof reviewItemInclude;
}>;

type ReviewSummaryRow = Prisma.ReviewsGetPayload<{
    select: typeof reviewSummarySelect;
}>;

export function toReviewItem(row: ReviewItemRow): ReviewItem {
    return {
        id: row.id,
        customer_id: row.customer_id,
        customer_name: row.customer_name,
        title: row.title,
        review: row.review,
        rating: row.rating,
        likes: row.likes,
        dislikes: row.dislikes,
        market_variant_id: row.market_variant_id,
        created_at: row.created_at,
        review_images: row.review_images,
    };
}

export function toReviewSummary(row: ReviewSummaryRow): ReviewSummary {
    return {
        id: row.id,
        customer_name: row.customer_name,
        title: row.title,
        review: row.review,
        rating: row.rating,
        created_at: row.created_at,
        image_url: row.review_images[0]?.image_url ?? null,
    };
}
