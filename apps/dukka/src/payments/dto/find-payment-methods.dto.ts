import { Transform } from 'class-transformer';
import {
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsDateString,
    IsOptional,
    IsUUID,
} from 'class-validator';

function toBoolean(value: unknown): unknown {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
}

function toStringArray(value: unknown): unknown {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === 'string') {
        return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return value;
}

export class FindPaymentMethodsDto {
    @IsOptional()
    @Transform(({ value }) => toBoolean(value))
    @IsBoolean()
    market_approved?: boolean;

    @IsOptional()
    @Transform(({ value }) => toStringArray(value))
    @IsArray()
    @ArrayUnique()
    @IsUUID('4', { each: true })
    market_ids?: string[];

    @IsOptional()
    @IsDateString()
    from_date?: string;

    @IsOptional()
    @IsDateString()
    to_date?: string;
}
