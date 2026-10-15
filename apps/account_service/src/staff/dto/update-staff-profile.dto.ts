import {
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { Gender } from '../../../generated/prisma/client.js';

export class UpdateStaffProfileDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    job_title?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2048)
    bio?: string;

    @IsOptional()
    @IsDateString()
    date_of_birth?: string;

    @IsOptional()
    @IsEnum(Gender)
    gender?: Gender;

    @IsOptional()
    @IsString()
    @MaxLength(512)
    address?: string;

    @IsOptional()
    @IsDateString()
    hire_date?: string;
}
