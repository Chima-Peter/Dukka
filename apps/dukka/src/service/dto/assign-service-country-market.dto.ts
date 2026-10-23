import { IsUUID } from 'class-validator';

export class AssignServiceCountryMarketDto {
    @IsUUID()
    market_id!: string;
}
