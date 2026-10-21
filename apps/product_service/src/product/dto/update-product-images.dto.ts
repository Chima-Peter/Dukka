import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    ValidateNested,
} from 'class-validator';
import { CreateProductImageDto } from './create-product-image.dto.js';

export class UpdateProductImagesDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique((image: CreateProductImageDto) => image.sort_order)
    @ValidateNested({ each: true })
    @Type(() => CreateProductImageDto)
    images!: CreateProductImageDto[];
}
