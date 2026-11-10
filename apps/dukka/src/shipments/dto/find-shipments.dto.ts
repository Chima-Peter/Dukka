import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { ShipmentStatus } from '@app/common';

export class FindShipmentsDto {
    @IsOptional()
    @IsEnum(ShipmentStatus)
    status?: ShipmentStatus;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    tracking_number?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    carrier?: string;

    @IsOptional()
    @IsUUID()
    order_id?: string;

    @IsOptional()
    @IsUUID()
    market_id?: string;

    @IsOptional()
    @IsUUID()
    warehouse_id?: string;

    @IsOptional()
    @IsUUID()
    distribution_point_id?: string;

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
