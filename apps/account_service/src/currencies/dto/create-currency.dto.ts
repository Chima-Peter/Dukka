import {
    IsBoolean,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateCurrencyDto {
    @IsString()
    @Matches(/^[A-Z]{3}$/, {
        message: 'Currency code must be 3 uppercase letters (e.g. NGN)',
    })
    code!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(128)
    name!: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}
