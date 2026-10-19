import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class AssignStaffMarketDto {
    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('4', { each: true })
    market_ids!: string[];
}
