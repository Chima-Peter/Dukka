import { IsUUID } from 'class-validator';

export class StaffPaystackPayDto {
    @IsUUID()
    market_id!: string;
}
