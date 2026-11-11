import { Type } from 'class-transformer';
import {
    IsDateString,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { OrderRefundStatus } from '@app/common';

export class FindOrderRefundsDto {
    @IsUUID()
    market_id!: string;

    @IsOptional()
    @IsEnum(OrderRefundStatus)
    status?: OrderRefundStatus;

    @IsOptional()
    @IsUUID()
    order_id?: string;

    @IsOptional()
    @IsUUID()
    warehouse_id?: string;

    @IsOptional()
    @IsUUID()
    customer_id?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(64)
    provider?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    payment_reference?: string;

    @IsOptional()
    @IsDateString()
    from_date?: string;

    @IsOptional()
    @IsDateString()
    to_date?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    min_amount?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    max_amount?: number;

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
