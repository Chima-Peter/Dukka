import { IsEnum, IsOptional } from 'class-validator';
import { MarketStatus } from '../../../generated/prisma/client.js';

export class FindStaffMarketsDto {
    @IsOptional()
    @IsEnum(MarketStatus)
    status?: MarketStatus;
}
