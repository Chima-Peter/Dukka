import { IsString, Matches, } from 'class-validator';

export class SearchServiceCountriesDto {
    @IsString()
    @IsString()
    @Matches(/^[A-Z]{2}$/, {
        message: 'iso2 must be 2 uppercase letters (e.g. NG)',
    })
    iso2!: string;
}
