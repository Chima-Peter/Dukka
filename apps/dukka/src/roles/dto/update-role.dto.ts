import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

const SCOPE_TYPES = [
    'GLOBAL',
    'MARKET',
    'WAREHOUSE',
    'DISTRIBUTION_POINT',
] as const;

export class UpdateRoleDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(512)
    description?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    hierarchy?: number;

    @IsOptional()
    @IsIn(SCOPE_TYPES)
    scope_type?: (typeof SCOPE_TYPES)[number];
}
