import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsDateString,
    IsInt,
    IsOptional,
    IsUUID,
    Min,
} from 'class-validator';

export class AddPromotionMarketDto {
    @IsUUID()
    market_id!: string;

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

    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(20)
    @ArrayUnique()
    @IsUUID('4', { each: true })
    variant_ids!: string[];
}
