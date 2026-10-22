export type CreateProductRecord = {
    name: string;
    description: string;
    specs: Record<string, unknown>;
    market_category_id: string;
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
