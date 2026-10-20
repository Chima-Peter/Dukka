import { Type } from 'class-transformer';
import {
    IsNumber,
    IsString,
    IsUUID,
    Matches,
    Min,
} from 'class-validator';

export class SetMarketPriceDto {
    @IsUUID()
    market_id!: string;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price!: number;

    @IsString()
    @Matches(/^[A-Z]{3}$/, {
        message: 'Currency code must be 3 uppercase letters (e.g. NGN)',
    })
    currency!: string;
}
