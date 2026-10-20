import { IsUUID } from 'class-validator';

export class FindInventoryDto {
    @IsUUID()
    market_id!: string;
}
