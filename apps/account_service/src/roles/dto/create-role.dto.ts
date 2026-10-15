import {
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class CreateRoleDto {
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    name!: string;

    @IsOptional()
    @IsString()
    @MaxLength(512)
    description?: string;

    @IsInt()
    @Min(0)
    hierarchy!: number;
}
