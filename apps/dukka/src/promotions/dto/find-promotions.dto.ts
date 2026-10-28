import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PromotionStatus } from '@app/common';

export class FindPromotionsDto {
    @IsUUID()
    market_id!: string;

    @IsOptional()
    @IsEnum(PromotionStatus)
    status?: PromotionStatus;
}
