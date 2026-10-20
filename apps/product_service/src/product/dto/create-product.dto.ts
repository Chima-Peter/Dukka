import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsObject,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
    ValidateNested,
} from 'class-validator';
import { CreateProductImageDto } from './create-product-image.dto.js';
import { CreateVariantDto } from './create-variant.dto.js';

export class CreateProductDto {
    @IsString()
    @MinLength(1)
    @MaxLength(256)
    name!: string;

    @IsString()
    @MinLength(1)
    @MaxLength(5000)
    description!: string;

    @IsObject()
    specs!: Record<string, unknown>;

    @IsUUID()
    category_id!: string;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique((image: CreateProductImageDto) => image.sort_order)
    @ValidateNested({ each: true })
    @Type(() => CreateProductImageDto)
    images!: CreateProductImageDto[];

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateVariantDto)
    variants!: CreateVariantDto[];
}
