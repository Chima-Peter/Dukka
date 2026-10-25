import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsUUID,
    Max,
    Min,
} from 'class-validator';
import { OrderStatus } from '@app/common';

export class FindStaffOrdersDto {
    @IsUUID()
    market_id!: string;

    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;

    @IsOptional()
    @IsDateString()
    from_date?: string;

    @IsOptional()
    @IsDateString()
    to_date?: string;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    })
    @IsBoolean()
    guest_only?: boolean;

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
