export type SignedUpload = {
    upload_token: string;
    signed_url: string;
    file_path: string;
};

export type ImageUploadUrls = {
    product_images: Record<string, SignedUpload>;
    variant_images: Record<string, SignedUpload>;
};