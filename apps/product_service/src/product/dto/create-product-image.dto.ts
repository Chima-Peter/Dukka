import { Type } from 'class-transformer';
import {
    IsInt,
    IsString,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class CreateProductImageDto {
    @IsString()
    @MinLength(1)
    @MaxLength(1024)
    image_path!: string;

    @Type(() => Number)
    @IsInt()
    @Min(0)
    sort_order!: number;
}
