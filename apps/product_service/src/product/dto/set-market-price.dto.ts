import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class SetMarketPriceDto {
    @IsUUID()
    market_id!: string;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price!: number;
}
