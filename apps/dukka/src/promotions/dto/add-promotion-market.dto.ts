import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsUUID,
    Min,
    ValidateIf,
} from 'class-validator';
import { PromotionMarketScope } from '@app/common';

export class AddPromotionMarketDto {
    @IsUUID()
    market_id!: string;

    @IsEnum(PromotionMarketScope)
    scope!: PromotionMarketScope;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    max_total_uses?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    max_uses_per_customer?: number;

    @IsDateString()
    start_date!: string;

    @IsDateString()
    end_date!: string;

    @ValidateIf((data) => data.scope === PromotionMarketScope.CATEGORY)
    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @IsUUID('4', { each: true })
    category_ids?: string[];

    @ValidateIf((data) => data.scope === PromotionMarketScope.PRODUCT)
    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @IsUUID('4', { each: true })
    product_ids?: string[];

    @ValidateIf((data) => data.scope === PromotionMarketScope.VARIANT)
    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @IsUUID('4', { each: true })
    variant_ids?: string[];
}
