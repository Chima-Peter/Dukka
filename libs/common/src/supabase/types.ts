import type { Readable } from 'node:stream';

export const AVATAR_BUCKET = 'avatar';
export const PRODUCT_BUCKET = 'products';
export const REVIEWS_BUCKET = 'reviews';
export const QUALIFICATIONS_BUCKET = 'qualifications';

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const MAX_QUALIFICATION_BYTES = 5 * 1024 * 1024;

export const ALLOWED_AVATAR_CONTENT_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
]);

export const ALLOWED_PRODUCT_CONTENT_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
]);

export const ALLOWED_QUALIFICATION_CONTENT_TYPES = new Set([
    'application/pdf',
]);

export type UploadBody =
    | Buffer
    | Blob
    | File
    | ArrayBuffer
    | FormData
    | NodeJS.ReadableStream
    | Readable
    | string;

export interface UploadOptions {
    contentType?: string;
    upsert?: boolean;
    cacheControl?: string;
}

export interface StorageObjectInfo {
    name: string;
    size: number;
    contentType: string;
}
