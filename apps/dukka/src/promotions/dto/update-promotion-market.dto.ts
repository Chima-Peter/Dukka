import { Type } from 'class-transformer';
import {
    IsDateString,
    IsInt,
    IsOptional,
    Min,
} from 'class-validator';

export class UpdatePromotionMarketDto {
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

    @IsOptional()
    @IsDateString()
    start_date?: string;

    @IsOptional()
    @IsDateString()
    end_date?: string;
}
