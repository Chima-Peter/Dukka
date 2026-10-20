import {
    ArrayUnique,
    IsArray,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

const FILENAME_PATTERN = /^[\w.\- ()]+\.\w+$/;

export class UploadFileDto {
    @IsArray()
    @ArrayUnique()
    @IsString({ each: true })
    @MinLength(1, { each: true })
    @MaxLength(255, { each: true })
    @Matches(FILENAME_PATTERN, {
        each: true,
        message:
            'each product image name must be a filename with an extension (e.g. photo.jpg)',
    })
    product_images: string[] = [];

    @IsArray()
    @ArrayUnique()
    @IsString({ each: true })
    @MinLength(1, { each: true })
    @MaxLength(255, { each: true })
    @Matches(FILENAME_PATTERN, {
        each: true,
        message:
            'each variant image name must be a filename with an extension (e.g. variant.png)',
    })
    variant_images: string[] = [];
}
