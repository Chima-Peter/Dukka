import { IsUUID } from 'class-validator';

export class FindOrderRefundDto {
    @IsUUID()
    market_id!: string;
}
