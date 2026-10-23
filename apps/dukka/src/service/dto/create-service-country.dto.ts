import {
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateServiceCountryDto {
    @IsString()
    @Matches(/^[A-Z]{2}$/, {
        message: 'Service country code must be 2 uppercase letters (e.g. NG)',
    })
    code!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(128)
    name!: string;
}
