import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
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
import { OrderPaymentAttemptStatus } from '@app/common';

export class FindPaymentAttemptsDto {
    @IsUUID()
    market_id!: string;

    @IsOptional()
    @IsEnum(OrderPaymentAttemptStatus)
    status?: OrderPaymentAttemptStatus;

    @IsOptional()
    @IsUUID()
    payment_method_id?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    payment_method_name?: string;

    @IsOptional()
    @IsDateString()
    from_date?: string;

    @IsOptional()
    @IsDateString()
    to_date?: string;

    @IsOptional()
    @IsUUID()
    order_id?: string;

    @IsOptional()
    @IsUUID()
    warehouse_id?: string;

    @IsOptional()
    @IsUUID()
    country_id?: string;

    @IsOptional()
    @IsUUID()
    customer_id?: string;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    })
    @IsBoolean()
    is_guest?: boolean;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    min_price?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    max_price?: number;

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
