import {
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreatePermissionDto {
    @IsString()
    @MinLength(3)
    @MaxLength(128)
    @Matches(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, {
        message:
            'Permission name must use lowercase dot notation (e.g. orders.read)',
    })
    name!: string;

    @IsOptional()
    @IsString()
    @MaxLength(512)
    description?: string;
}
