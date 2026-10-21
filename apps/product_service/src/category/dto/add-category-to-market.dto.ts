import { IsUUID } from 'class-validator';

export class AddCategoryToMarketDto {
    @IsUUID()
    market_id!: string;
}
