import { IsUUID } from 'class-validator';

export class CheckAvailabilityDto {
    @IsUUID()
    market_id!: string;

    @IsUUID()
    product_id!: string;
}
