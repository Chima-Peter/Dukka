import { IsUUID } from 'class-validator';

export class RetryOrderRefundDto {
    @IsUUID()
    market_id!: string;
}
