import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
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
import { LogisticsPartnerType } from '@app/common';

export class FindLogisticsPartnersDto {
    @IsOptional()
    @IsEnum(LogisticsPartnerType)
    partner_type?: LogisticsPartnerType;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(256)
    name?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(64)
    code?: string;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    })
    @IsBoolean()
    is_active?: boolean;

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
