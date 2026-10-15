import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    name!: string;

    @IsOptional()
    @IsString()
    @MaxLength(512)
    description?: string;
}
