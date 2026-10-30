import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class PromotionMarketVariantsDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(20)
    @ArrayUnique()
    @IsUUID('4', { each: true })
    variant_ids!: string[];
}
