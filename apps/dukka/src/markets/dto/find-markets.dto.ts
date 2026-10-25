import { IsEnum, IsOptional } from 'class-validator';
import { MarketStatus } from '@app/common';

export class FindMarketsDto {
    @IsOptional()
    @IsEnum(MarketStatus)
    status?: MarketStatus;
}
