import { IsOptional, IsUUID } from 'class-validator';

export class FindStaffProductDto {
    @IsOptional()
    @IsUUID()
    market_id?: string;
}
