import {
    IsEmail,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateShippingAddressDto {
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    first_name!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(128)
    last_name!: string;

    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(32)
    phone_number!: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(32)
    whatsapp_number?: string;

    @IsString()
    @MinLength(1)
    @MaxLength(128)
    country!: string;

    @IsUUID()
    state!: string;

    @IsUUID()
    market_id!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(512)
    street_address!: string;
}
