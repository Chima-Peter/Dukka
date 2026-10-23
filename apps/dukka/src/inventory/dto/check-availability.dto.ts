import { IsOptional, IsUUID } from 'class-validator';

export class CheckAvailabilityDto {
    @IsOptional()
    @IsUUID()
    market_id?: string;

    @IsUUID()
    product_id!: string;
}
