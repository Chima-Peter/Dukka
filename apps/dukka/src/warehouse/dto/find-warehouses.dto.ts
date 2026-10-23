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
import { WarehouseStatus } from '../../../generated/prisma/client.js';

export class FindWarehousesDto {
    @IsOptional()
    @IsUUID()
    country_id?: string;

    @IsOptional()
    @IsUUID()
    market_id?: string;

    @IsOptional()
    @IsUUID()
    manager_id?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(256)
    name?: string;

    @IsOptional()
    @IsEnum(WarehouseStatus)
    status?: WarehouseStatus;

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
