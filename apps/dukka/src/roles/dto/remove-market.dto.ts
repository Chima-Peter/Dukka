import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class RemoveMarketDto {
    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('4', { each: true })
    market_ids!: string[];
}