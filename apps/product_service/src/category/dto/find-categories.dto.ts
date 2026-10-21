import { IsUUID } from 'class-validator';

export class FindCategoriesDto {
    @IsUUID()
    market_id!: string;
}
