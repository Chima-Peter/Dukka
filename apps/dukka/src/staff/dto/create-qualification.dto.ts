import {
    IsOptional,
    IsString,
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
    @IsString()
    @MinLength(10)
    @MaxLength(1024)
    document_path?: string;
}
