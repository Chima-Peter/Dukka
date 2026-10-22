import { Type } from 'class-transformer';
import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateInventoryDto {
    @IsUUID()
    market_id!: string;

    @IsUUID()
    market_variant_id!: string;

    @IsUUID()
    warehouse_id!: string;

    @Type(() => Number)
    @IsInt()
    @Min(0)
    available_quantity!: number;
}
