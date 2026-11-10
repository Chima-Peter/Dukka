import {
    IsEmail,
    IsEnum,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';
import { LogisticsPartnerType } from '@app/common';

export class CreateLogisticsPartnerDto {
    @IsString()
    @MinLength(1)
    @MaxLength(256)
    name!: string;

    @IsEnum(LogisticsPartnerType)
    partner_type!: LogisticsPartnerType;

    @IsEmail()
    @MaxLength(256)
    contact_email!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(32)
    contact_phone!: string;

    @IsString()
    @MinLength(2)
    @MaxLength(64)
    @Matches(/^[A-Z0-9_-]+$/, {
        message:
            'Partner code must be uppercase letters, numbers, underscores, or hyphens',
    })
    code!: string;
}
