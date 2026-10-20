import {
    IsBoolean,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    MaxLength,
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

    @IsUUID()
    currency_id!: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}
