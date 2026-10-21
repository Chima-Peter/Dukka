import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class CreateReviewDto {
    @IsUUID()
    market_variant_id!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(256)
    title!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(5000)
    review!: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(5)
    rating!: number;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10)
    @IsString({ each: true })
    @MinLength(1, { each: true })
    @MaxLength(1024, { each: true })
    image_paths?: string[];
}
