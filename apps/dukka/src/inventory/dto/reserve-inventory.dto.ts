import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsInt,
    IsUUID,
    Min,
    ValidateNested,
} from 'class-validator';

export class ReserveInventoryItemDto {
    @IsUUID()
    market_variant_id!: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantity!: number;
}

export class ReserveInventoryDto {
    @IsUUID()
    market_id!: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ReserveInventoryItemDto)
    items!: ReserveInventoryItemDto[];
}
