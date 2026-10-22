import {
    IsBoolean,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

export class UpdateCurrencyDto {
    @IsOptional()
    @IsString()
    @Matches(/^[A-Z]{3}$/, {
        message: 'Currency code must be 3 uppercase letters (e.g. NGN)',
    })
    code?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    name?: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}
