import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsUUID,
    Max,
    Min,
} from 'class-validator';
import { POINT_STATUS } from '../../../generated/prisma/client.js';

export class FindPointsHistoryDto {
    @IsOptional()
    @IsEnum(POINT_STATUS)
    status?: POINT_STATUS;

    @IsOptional()
    @IsUUID()
    cursor?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit: number = 20;
}
