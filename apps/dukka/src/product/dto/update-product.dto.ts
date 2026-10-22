import {
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';

export class UpdateProductDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(256)
    name?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(5000)
    description?: string;

    @IsOptional()
    @IsObject()
    specs?: Record<string, unknown>;

    @IsOptional()
    @IsUUID()
    market_category_id?: string;
}
