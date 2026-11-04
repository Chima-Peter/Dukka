import {
    IsBoolean,
    IsOptional,
    IsString,
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
    @IsString()
    @MinLength(10)
    @MaxLength(512)
    avatar_path?: string;

    @IsOptional()
    @IsString()
    @MaxLength(32)
    phone_number?: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}
