import { Type } from 'class-transformer';
import {
    IsNumber,
    IsString,
    IsUUID,
    Matches,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class CreateMarketDto {
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    name!: string;

    @IsString()
    @MinLength(2)
    @MaxLength(32)
    @Matches(/^[A-Z][A-Z0-9_]*$/, {
        message:
            'Market code must be uppercase letters, numbers, or underscores (e.g. LAGOS_01)',
    })
    code!: string;

    @IsString()
    @Matches(/^[A-Z]{2}$/, {
        message: 'iso2 must be 2 uppercase letters (e.g. NG)',
    })
    iso2!: string;

    @IsString()
    @Matches(/^[A-Z]{3}$/, {
        message: 'iso3 must be 3 uppercase letters (e.g. NGA)',
    })
    iso3!: string;

    @IsUUID()
    currency_id!: string;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    cash_limit!: number;
}
