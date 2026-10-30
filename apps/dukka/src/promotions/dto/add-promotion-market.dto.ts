import {
    ArrayMaxSize,
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsDateString,
    IsUUID,
} from 'class-validator';

export class AddPromotionMarketDto {
    @IsUUID()
    market_id!: string;

    @IsDateString()
    start_date!: string;

    @IsDateString()
    end_date!: string;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(20)
    @ArrayUnique()
    @IsUUID('4', { each: true })
    variant_ids!: string[];
}
