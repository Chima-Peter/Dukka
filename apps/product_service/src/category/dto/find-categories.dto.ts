import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class FindCategoriesDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    name?: string;
}
