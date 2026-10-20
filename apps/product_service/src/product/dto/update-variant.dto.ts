import {
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class UpdateVariantDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(64)
    variant_code?: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    color?: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    size?: string;

    @IsOptional()
    @IsObject()
    variant_info?: Record<string, unknown>;
}
