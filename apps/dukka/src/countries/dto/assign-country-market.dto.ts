import { IsUUID } from 'class-validator';

export class AssignCountryMarketDto {
    @IsUUID()
    market_id!: string;
}
