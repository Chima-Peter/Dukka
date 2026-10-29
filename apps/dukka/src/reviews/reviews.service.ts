import {
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { REVIEWS_BUCKET, SupabaseService } from '@app/common';
import { assertValidImage } from '../shared/assert-valid-image.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import { safeDeleteImages } from '../shared/safe-delete-images.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';
import type { FindReviewsDto } from './dto/find-reviews.dto.js';
import type { UploadReviewImagesDto } from './dto/upload-review-images.dto.js';
import { ReviewsRepository } from './reviews.repository.js';
import type { PrismaErrorMap } from './types/prisma-error.type.js';
import type { ReviewItem } from './types/review.type.js';
import type { ReviewImageUploadUrls } from './types/upload.type.js';

@Injectable()
export class ReviewsService {
    private readonly logger = new Logger(ReviewsService.name);

    constructor(
        private readonly reviewsRepository: ReviewsRepository,
        private readonly supabaseService: SupabaseService,
    ) {}

    async getImageUploadURLs(
        customerId: string,
        data: UploadReviewImagesDto,
    ): Promise<ReviewImageUploadUrls> {
        try {
            this.logger.log(
                `Generating review upload URLs for customer ${customerId}: ${data.images.length} image(s)`,
            );
            const entries = await Promise.all(
                data.images.map(async (name) => {
                    const upload =
                        await this.supabaseService.createSignedUploadUrl(
                            customerId,
                            name,
                            REVIEWS_BUCKET,
                        );
                    return [name, upload] as const;
                }),
            );
            return { images: Object.fromEntries(entries) };
        } catch (error) {
            this.handleError(error);
        }
    }

    async create(
        customerId: string,
        customerName: string,
        data: CreateReviewDto,
    ): Promise<ReviewItem> {
        try {
            this.logger.log(
                `Creating review for market variant ${data.market_variant_id} by customer ${customerId}`,
            );

            if (data.image_paths !== undefined && data.image_paths.length > 0) {
                await Promise.all(
                    data.image_paths.map((path) =>
                        assertValidImage(this.supabaseService, path, {
                            bucket: REVIEWS_BUCKET,
                            logger: this.logger,
                        }),
                    ),
                );
            }

            const image_urls = data.image_paths?.map((path) =>
                this.supabaseService.getPublicURL(path, REVIEWS_BUCKET),
            );

            const review = await this.reviewsRepository.create(customerId, {
                customer_name: customerName,
                market_variant_id: data.market_variant_id,
                title: data.title,
                review: data.review,
                rating: data.rating,
                ...(image_urls !== undefined && { image_urls }),
            });
            this.logger.log(`Review created ${review.id}`);
            return review;
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                (error.code === 'P2003' || error.code === 'P2025')
            ) {
                throw this.createRelationNotFound(error);
            }
            this.handleError(error);
        }
    }

    async findAll(query: FindReviewsDto) {
        try {
            this.logger.log(
                `Fetching reviews for market variant ${query.market_variant_id}`,
            );
            const page =
                await this.reviewsRepository.findAllByMarketVariant(query);
            this.logger.log(
                `Fetched reviews for market variant ${query.market_variant_id}`,
            );
            return {
                items: page.items,
                next_cursor: page.next_cursor,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(customerId: string, id: string): Promise<ReviewItem> {
        try {
            this.logger.log(`Deleting review ${id} by customer ${customerId}`);
            await this.assertOwnership(id, customerId);
            const review = await this.reviewsRepository.delete(id);

            await safeDeleteImages(
                this.supabaseService,
                review.review_images.map((image) => image.image_url),
                { bucket: REVIEWS_BUCKET, logger: this.logger },
            );

            this.logger.log(`Review deleted ${id}`);
            return review;
        } catch (error) {
            this.handleError(error, {
                notFound: { P2025: 'Review not found' },
            });
        }
    }

    async like(id: string) {
        try {
            this.logger.log(`Liking review ${id}`);
            const review = await this.reviewsRepository.incrementLikes(id);
            this.logger.log(`Review ${id} liked (likes=${review.likes})`);
            return review;
        } catch (error) {
            this.handleError(error, {
                notFound: { P2025: 'Review not found' },
            });
        }
    }

    async dislike(id: string) {
        try {
            this.logger.log(`Disliking review ${id}`);
            const review = await this.reviewsRepository.incrementDislikes(id);
            this.logger.log(
                `Review ${id} disliked (dislikes=${review.dislikes})`,
            );
            return review;
        } catch (error) {
            this.handleError(error, {
                notFound: { P2025: 'Review not found' },
            });
        }
    }

    private async assertOwnership(
        id: string,
        customerId: string,
    ): Promise<void> {
        const review = await this.reviewsRepository.findById(id);
        if (!review) {
            throw new NotFoundException('Review not found');
        }
        if (review.customer_id !== customerId) {
            throw new ForbiddenException(
                'You can only delete your own reviews',
            );
        }
    }

    private handleError(error: unknown, messages: PrismaErrorMap = {}): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (error instanceof PrismaClientKnownRequestError) {
            const notFoundMessage =
                messages.notFound?.[
                    error.code as keyof NonNullable<PrismaErrorMap['notFound']>
                ];
            if (notFoundMessage !== undefined) {
                throw new NotFoundException(notFoundMessage);
            }

            const conflictMessage =
                messages.conflict?.[
                    error.code as keyof NonNullable<PrismaErrorMap['conflict']>
                ];
            if (conflictMessage !== undefined) {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException(conflictMessage);
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }

    private createRelationNotFound(
        error: PrismaClientKnownRequestError,
    ): NotFoundException {
        switch (prismaMissingRecordModel(error)) {
            case 'marketvariant':
                return new NotFoundException('Market variant not found');
            case 'customer':
                return new NotFoundException('Customer not found');
            default:
                if (
                    prismaHintIncludes(
                        error,
                        'market_variant',
                        'marketvariant',
                    )
                ) {
                    return new NotFoundException('Market variant not found');
                }
                if (prismaHintIncludes(error, 'customer')) {
                    return new NotFoundException('Customer not found');
                }
                return new NotFoundException('Market variant not found');
        }
    }
}
