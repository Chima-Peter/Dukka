import { Logger } from '@nestjs/common';
import { PRODUCT_BUCKET, type SupabaseService } from '@app/common';

export async function safeDeleteImages(
    supabaseService: SupabaseService,
    publicUrls: string[],
    options?: {
        bucket?: string;
        logger?: Logger;
    },
): Promise<void> {
    const bucket = options?.bucket ?? PRODUCT_BUCKET;
    const logger = options?.logger;
    const prefix = supabaseService.getPublicURL('', bucket);

    const storagePaths = publicUrls
        .map((url) => {
            if (!url.startsWith(prefix)) {
                return null;
            }
            return decodeURIComponent(url.slice(prefix.length));
        })
        .filter((path): path is string => path !== null);

    if (storagePaths.length === 0) {
        return;
    }

    try {
        await supabaseService.deleteFile(storagePaths, bucket);
    } catch (error) {
        logger?.warn(
            `Failed to delete image(s) ${storagePaths.join(',')}: ${error}`,
        );
    }
}
