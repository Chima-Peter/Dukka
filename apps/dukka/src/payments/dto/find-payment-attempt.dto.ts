import { IsUUID } from 'class-validator';

export class FindPaymentAttemptDto {
    @IsUUID()
    market_id!: string;
}
