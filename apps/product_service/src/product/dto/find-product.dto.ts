import { IsUUID } from 'class-validator';

export class FindProductDto {
    @IsUUID()
    market_id!: string;
}
