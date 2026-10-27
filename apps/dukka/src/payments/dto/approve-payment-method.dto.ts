import { IsUUID } from 'class-validator';

export class ApprovePaymentMethodDto {
    @IsUUID()
    market_id!: string;
}
