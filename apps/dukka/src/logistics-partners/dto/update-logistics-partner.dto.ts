import {
    IsEmail,
    IsEnum,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';
import { LogisticsPartnerType } from '@app/common';

export class UpdateLogisticsPartnerDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(256)
    name?: string;

    @IsOptional()
    @IsEnum(LogisticsPartnerType)
    partner_type?: LogisticsPartnerType;

    @IsOptional()
    @IsEmail()
    @MaxLength(256)
    contact_email?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(32)
    contact_phone?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(64)
    @Matches(/^[A-Z0-9_-]+$/, {
        message:
            'Partner code must be uppercase letters, numbers, underscores, or hyphens',
    })
    code?: string;
}
