import {
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

export class UpdateCountryDto {
    @IsOptional()
    @IsString()
    @Matches(/^[A-Z]{2}$/, {
        message: 'Country code must be 2 uppercase letters (e.g. NG)',
    })
    code?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    name?: string;
}
