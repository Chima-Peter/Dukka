import { Type } from 'class-transformer';
import {
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class FindProductSuggestionsDto {
    @IsString()
    @MinLength(2)
    @MaxLength(256)
    q!: string;

    @IsOptional()
    @IsUUID()
    market_id?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    limit: number = 8;
}
