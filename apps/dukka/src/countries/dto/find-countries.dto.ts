import { IsOptional, IsUUID } from 'class-validator';

export class FindCountriesDto {
    @IsOptional()
    @IsUUID()
    market_id?: string;
}
