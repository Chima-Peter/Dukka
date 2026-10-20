import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateWarehouseDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(256)
    name?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(1000)
    address?: string;
}
