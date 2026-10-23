import { IsOptional, IsUUID } from 'class-validator';

export class FindProductDto {
    @IsOptional()
    @IsUUID()
    market_id?: string;
}
