import { IsEnum, IsOptional } from 'class-validator';
import { ServiceCountryStatus } from '../../../generated/prisma/client.js';

export class FindStaffServiceCountriesDto {
    @IsOptional()
    @IsEnum(ServiceCountryStatus)
    status?: ServiceCountryStatus;
}
