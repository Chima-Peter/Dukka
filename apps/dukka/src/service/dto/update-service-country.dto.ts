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
    @MinLength(1)
    @MaxLength(128)
    name?: string;

    @IsOptional()
    @IsString()
    @Matches(/^[A-Z]{2}$/, {
        message: 'iso2 must be 2 uppercase letters (e.g. NG)',
    })
    iso2?: string;

    @IsOptional()
    @IsString()
    @Matches(/^[A-Z]{3}$/, {
        message: 'iso3 must be 3 uppercase letters (e.g. NGA)',
    })
    iso3?: string;
}
