import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsUUID,
    Max,
    Min,
} from 'class-validator';
import { ServiceStateStatus } from '@app/common';

export class FindStaffServiceStatesDto {
    @IsUUID()
    country_id!: string;

    @IsOptional()
    @IsEnum(ServiceStateStatus)
    status?: ServiceStateStatus;

    @IsOptional()
    @IsUUID()
    cursor?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit: number = 50;
}
