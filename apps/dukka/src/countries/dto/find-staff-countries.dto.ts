import { IsEnum, IsOptional } from 'class-validator';
import { CountryStatus } from '../../../generated/prisma/client.js';

export class FindStaffCountriesDto {
    @IsOptional()
    @IsEnum(CountryStatus)
    status?: CountryStatus;
}
