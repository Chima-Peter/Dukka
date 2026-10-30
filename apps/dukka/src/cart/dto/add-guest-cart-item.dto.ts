import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class AddGuestCartItemDto {
    @IsOptional()
    @IsUUID()
    cart_id?: string;

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
