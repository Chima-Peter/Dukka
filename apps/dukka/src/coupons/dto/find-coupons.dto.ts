import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { CouponStatus, CouponType } from '@app/common';

export class FindCouponsDto {
    @IsOptional()
    @IsEnum(CouponStatus)
    status?: CouponStatus;

    @IsOptional()
    @IsEnum(CouponType)
    type?: CouponType;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(64)
    code?: string;

    @IsOptional()
    @IsUUID()
    cursor?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit: number = 20;
}
