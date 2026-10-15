import {
    IsBoolean,
    IsEmail,
    IsOptional,
    IsString,
    IsStrongPassword,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateStaffDto {
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    name!: string;

    @IsEmail()
    email!: string;

    @IsString()
    @IsStrongPassword(
        {
            minLength: 12,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
        },
        {
            message:
                'Password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol',
        },
    )
    @MaxLength(128)
    password!: string;

    @IsUUID()
    role_id!: string;

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
