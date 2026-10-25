import { Type } from 'class-transformer';
import {
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsUUID,
    Max,
    Min,
} from 'class-validator';
import { VariantPendingUpdateStatus } from '@app/common';

export class FindVariantPendingUpdatesDto {
    @IsOptional()
    @IsEnum(VariantPendingUpdateStatus)
    status?: VariantPendingUpdateStatus;

    @IsOptional()
    @IsDateString()
    from_date?: string;

    @IsOptional()
    @IsDateString()
    to_date?: string;

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
