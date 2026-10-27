import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
} from '@nestjs/common';
import {
    Auth,
    CurrentCustomer,
    Public,
    ResponseMessage,
    type CustomerJwtPayload,
} from '@app/common';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { FindReviewsDto } from './dto/find-reviews.dto.js';
import { UploadReviewImagesDto } from './dto/upload-review-images.dto.js';
import { ReviewsService } from './reviews.service.js';

@Auth('customer')
@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) {}

    @Post('upload-url')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Review image upload URLs generated successfully')
    getImageUploadURLs(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Body() data: UploadReviewImagesDto,
    ) {
        return this.reviewsService.getImageUploadURLs(customer.sub, data);
    }

    @Post()
    @ResponseMessage('Review created successfully')
    create(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Body() data: CreateReviewDto,
    ) {
        return this.reviewsService.create(customer.sub, customer.name, data);
    }

    @Get()
    @Public()
    @ResponseMessage('Reviews retrieved successfully')
    findAll(@Query() query: FindReviewsDto) {
        return this.reviewsService.findAll(query);
    }

    @Post(':id/like')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Review liked successfully')
    like(@Param('id', ParseUUIDPipe) id: string) {
        return this.reviewsService.like(id);
    }

    @Post(':id/dislike')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Review disliked successfully')
    dislike(@Param('id', ParseUUIDPipe) id: string) {
        return this.reviewsService.dislike(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Review deleted successfully')
    delete(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.reviewsService.delete(customer.sub, id);
    }
}
