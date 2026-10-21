import {
    ArrayMaxSize,
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

const FILENAME_PATTERN = /^[\w.\- ()]+\.\w+$/;

export class UploadReviewImagesDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(10)
    @ArrayUnique()
    @IsString({ each: true })
    @MinLength(1, { each: true })
    @MaxLength(255, { each: true })
    @Matches(FILENAME_PATTERN, {
        each: true,
        message:
            'each image name must be a filename with an extension (e.g. photo.jpg)',
    })
    images!: string[];
}
