import { Type } from 'class-transformer';
import {
    IsDateString,
    IsEnum,
    IsNumber,
    IsString,
    Matches,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { CouponType } from '@app/common';

export class CreateCouponDto {
    @IsString()
    @MinLength(2)
    @MaxLength(64)
    @Matches(/^[A-Z0-9_-]+$/, {
        message:
            'Coupon code must be uppercase letters, numbers, underscores, or hyphens',
    })
    code!: string;

    @IsEnum(CouponType)
    type!: CouponType;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    value!: number;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    max_discount_amount!: number;

    @IsDateString()
    expires_at!: string;
}
