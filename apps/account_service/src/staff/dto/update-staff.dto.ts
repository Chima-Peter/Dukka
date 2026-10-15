import {
    IsBoolean,
    IsEmail,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';

export class UpdateStaffDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsUUID()
    role_id?: string;

    @IsOptional()
    @IsString()
    @MaxLength(512)
    avatar?: string;

    @IsOptional()
    @IsString()
    @MaxLength(32)
    phone_number?: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}
