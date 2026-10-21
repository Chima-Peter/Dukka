export type SignedUpload = {
    upload_token: string;
    signed_url: string;
    file_path: string;
};

export type ReviewImageUploadUrls = {
    images: Record<string, SignedUpload>;
};
