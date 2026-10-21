import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    name!: string;
}
