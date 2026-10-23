import {
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

export class UpdateServiceCountryDto {
    @IsOptional()
    @IsString()
    @Matches(/^[A-Z]{2}$/, {
        message: 'Service country code must be 2 uppercase letters (e.g. NG)',
    })
    code?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    name?: string;
}
