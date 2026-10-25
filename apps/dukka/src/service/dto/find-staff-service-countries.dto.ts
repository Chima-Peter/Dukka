import { IsEnum, IsOptional } from 'class-validator';
import { ServiceCountryStatus } from '@app/common';

export class FindStaffServiceCountriesDto {
    @IsOptional()
    @IsEnum(ServiceCountryStatus)
    status?: ServiceCountryStatus;
}
