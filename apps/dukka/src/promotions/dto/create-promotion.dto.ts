import {
    IsString,
    IsUUID,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreatePromotionDto {
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    name!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(2000)
    description!: string;

    @IsString()
    @MinLength(2)
    @MaxLength(64)
    @Matches(/^[A-Z0-9_-]+$/, {
        message:
            'Promotion code must be uppercase letters, numbers, underscores, or hyphens',
    })
    code!: string;

    @IsUUID()
    discount_id!: string;
}
