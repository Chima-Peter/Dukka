import { IsUUID } from 'class-validator';

export class SetActiveMarketDto {
    @IsUUID()
    market_id!: string;
}
