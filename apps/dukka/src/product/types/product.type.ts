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
