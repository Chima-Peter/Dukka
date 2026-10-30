import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class AddCartItemDto {
    @IsUUID()
    market_variant_id!: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantity!: number;

    @IsOptional()
    @IsUUID()
    promotion_market_id?: string;
}
