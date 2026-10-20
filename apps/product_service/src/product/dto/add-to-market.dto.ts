import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class AddToMarketDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @IsUUID('4', { each: true })
    market_ids!: string[];
}
