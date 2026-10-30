import { Type } from 'class-transformer';
import { IsInt, IsUUID, Min } from 'class-validator';

export class AddCartItemDto {
    @IsUUID()
    market_variant_id!: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantity!: number;
}
