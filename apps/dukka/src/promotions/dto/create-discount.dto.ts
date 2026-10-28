import { Type } from 'class-transformer';
import { IsEnum, IsNumber, Min } from 'class-validator';
import { DiscountType } from '@app/common';

export class CreateDiscountDto {
    @IsEnum(DiscountType)
    type!: DiscountType;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    value!: number;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    max_discount_amount!: number;
}
