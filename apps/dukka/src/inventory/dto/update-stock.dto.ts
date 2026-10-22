import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsUUID, Min } from 'class-validator';

export enum StockUpdateType {
    INCREMENT = 'increment',
    DECREMENT = 'decrement',
}

export class UpdateStockDto {
    @IsUUID()
    market_id!: string;

    @IsUUID()
    market_variant_id!: string;

    @IsUUID()
    warehouse_id!: string;

    @IsEnum(StockUpdateType)
    type!: StockUpdateType;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantity!: number;
}
