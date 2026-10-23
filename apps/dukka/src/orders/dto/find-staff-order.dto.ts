import { IsUUID } from 'class-validator';

export class FindStaffOrderDto {
    @IsUUID()
    market_id!: string;
}
