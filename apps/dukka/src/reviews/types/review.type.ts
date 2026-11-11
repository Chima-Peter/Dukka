export type ReviewImageItem = {
    id: string;
    image_url: string;
    created_at: Date;
    updated_at: Date;
};

export type ReviewItem = {
    id: string;
    customer_id: string | null;
    customer_name: string;
    title: string;
    review: string;
    rating: number;
    likes: number | null;
    dislikes: number | null;
    market_variant_id: string;
    created_at: Date;
    review_images: ReviewImageItem[];
};

export type ReviewSummary = {
    id: string;
    customer_name: string;
    title: string;
    review: string;
    rating: number;
    created_at: Date;
    image_url: string | null;
};

export type ReviewSummaryPage = {
    items: ReviewSummary[];
    next_cursor: string | null;
};
