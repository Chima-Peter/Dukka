import { BadRequestException, Logger } from '@nestjs/common';
import {
    ALLOWED_PRODUCT_CONTENT_TYPES,
    PRODUCT_BUCKET,
    type SupabaseService,
} from '@app/common';

export async function assertValidImage(
    supabaseService: SupabaseService,
    imagePath: string,
    options?: {
        bucket?: string;
        allowedContentTypes?: Set<string>;
        logger?: Logger;
    },
): Promise<void> {
    const bucket = options?.bucket ?? PRODUCT_BUCKET;
    const allowedContentTypes =
        options?.allowedContentTypes ?? ALLOWED_PRODUCT_CONTENT_TYPES;
    const logger = options?.logger;

    const objectInfo = await supabaseService.getObjectInfo(imagePath, bucket);
    if (!objectInfo) {
        logger?.warn(`Image not found at ${imagePath}`);
        throw new BadRequestException('Invalid image filepath');
    }

    if (objectInfo.size <= 0) {
        logger?.warn(`Image at ${imagePath} is empty`);
        await supabaseService.deleteFile([imagePath], bucket);
        throw new BadRequestException('Image file is empty');
    }

    const contentType = objectInfo.contentType.toLowerCase();
    if (!allowedContentTypes.has(contentType)) {
        logger?.warn(
            `Image at ${imagePath} has invalid content type ${objectInfo.contentType}`,
        );
        await supabaseService.deleteFile([imagePath], bucket);
        throw new BadRequestException(
            'Image must be a JPEG, PNG, WebP, or GIF',
        );
    }
}
