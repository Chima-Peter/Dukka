import {
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateQualificationDto {
    @IsString()
    @MinLength(1)
    @MaxLength(256)
    title!: string;

    @IsOptional()
    @IsString()
    @MaxLength(2048)
    description?: string;

    @IsOptional()
    @IsUrl()
    @MaxLength(1024)
    document_url?: string;
}
