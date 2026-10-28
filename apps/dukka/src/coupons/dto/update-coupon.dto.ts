import { Type } from 'class-transformer';
import {
    IsDateString,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { CouponType } from '@app/common';

export class UpdateCouponDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(64)
    @Matches(/^[A-Z0-9_-]+$/, {
        message:
            'Coupon code must be uppercase letters, numbers, underscores, or hyphens',
    })
    code?: string;

    @IsOptional()
    @IsEnum(CouponType)
    type?: CouponType;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    value?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    max_discount_amount?: number;

    @IsOptional()
    @IsDateString()
    expires_at?: string;
}
