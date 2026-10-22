import {
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateVariantDto {
    @IsString()
    @MinLength(1)
    @MaxLength(64)
    variant_code!: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    color?: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    size?: string;

    @IsObject()
    variant_info!: Record<string, unknown>;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(1024)
    image_path?: string;
}
