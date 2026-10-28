import {
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

export class UpdatePromotionDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    name?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(2000)
    description?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(64)
    @Matches(/^[A-Z0-9_-]+$/, {
        message:
            'Promotion code must be uppercase letters, numbers, underscores, or hyphens',
    })
    code?: string;
}
