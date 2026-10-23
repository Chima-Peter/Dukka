import { IsEnum, IsOptional } from 'class-validator';
import { WarehouseStatus } from '../../../generated/prisma/client.js';
import { FindWarehousesDto } from './find-warehouses.dto.js';

export class FindStaffWarehousesDto extends FindWarehousesDto {
    @IsOptional()
    @IsEnum(WarehouseStatus)
    status?: WarehouseStatus;
}
