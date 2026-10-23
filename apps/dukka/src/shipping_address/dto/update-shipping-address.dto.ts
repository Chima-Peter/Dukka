import {
    IsEmail,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';

export class UpdateShippingAddressDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    first_name?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    last_name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(32)
    phone_number?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(32)
    whatsapp_number?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    country?: string;

    @IsOptional()
    @IsUUID()
    state?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(512)
    street_address?: string;
}
