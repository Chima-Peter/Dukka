import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { DiscountType } from '@app/common';

export class UpdateDiscountDto {
    @IsOptional()
    @IsEnum(DiscountType)
    type?: DiscountType;

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
}
