import { IsUUID } from 'class-validator';

export class SetActiveMarketDto {
    @IsUUID()
    country_id!: string;
}
