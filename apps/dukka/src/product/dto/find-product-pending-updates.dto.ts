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
import { ProductPendingUpdateStatus } from '../../../generated/prisma/client.js';

export class FindProductPendingUpdatesDto {
    @IsOptional()
    @IsEnum(ProductPendingUpdateStatus)
    status?: ProductPendingUpdateStatus;

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
