import { IsUUID } from 'class-validator';

export class DeleteServiceStateDto {
    @IsUUID()
    market_id!: string;
}
