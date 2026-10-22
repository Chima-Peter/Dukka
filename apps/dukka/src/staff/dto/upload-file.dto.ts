import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UploadFileDto {
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    @Matches(/^[\w.\- ()]+\.\w+$/, {
        message:
            'name must be a filename with an extension (e.g. photo.jpg or certificate.pdf)',
    })
    name!: string;
}
