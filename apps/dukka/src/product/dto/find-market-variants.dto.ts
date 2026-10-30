import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsUUID,
    Max,
    Min,
} from 'class-validator';
import { MarketVariantStatus } from '@app/common';

export class FindMarketVariantsDto {
    @IsUUID()
    market_id!: string;

    @IsOptional()
    @IsEnum(MarketVariantStatus)
    market_variant_status?: MarketVariantStatus;

    @IsOptional()
    @IsUUID()
    product_id?: string;

    @IsOptional()
    @IsUUID()
    cursor?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit: number = 50;
}
