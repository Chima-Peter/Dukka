export type ProductImageRecord = {
    image_url: string;
    sort_order: number;
};

export type CreateProductRecord = {
    name: string;
    description: string;
    specs: Record<string, unknown>;
    category_id: string;
    images: ProductImageRecord[];
    variants: {
        variant_code: string;
        color?: string;
        size?: string;
        variant_info: Record<string, unknown>;
        image_url?: string;
    }[];
};

export type CreateProductPendingUpdateData = {
    name?: string;
    description?: string;
    specs?: Record<string, unknown>;
    category_id?: string;
    images?: ProductImageRecord[];
};

export type ProductSuggestionItem = {
    id: string;
    name: string;
    image_url: string | null;
    price: unknown | null;
    currency: string | null;
    sold_out: boolean;
    promotion: null;
};

export type ProductSuggestionsPage = {
    items: ProductSuggestionItem[];
};

export type ProductsListPage = {
    items: Array<{
        id: string;
        name: string;
        image_url: string | null;
        price: unknown | null;
        currency: string | null;
        sold_out: boolean;
        promotion: {
            promotion_market_id: string;
            amount: unknown;
        } | null;
    }>;
    next_cursor: string | null;
};
