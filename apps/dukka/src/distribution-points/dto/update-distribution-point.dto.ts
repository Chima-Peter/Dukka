import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateDistributionPointDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(256)
    name?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(1000)
    address?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(256)
    city?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(32)
    zip?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(32)
    contact_phone?: string;
}
