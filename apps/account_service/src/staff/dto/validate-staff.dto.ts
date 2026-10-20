import {
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';

export class ValidateStaffDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @IsUUID('4', { each: true })
    staff_ids!: string[];

    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @IsString({ each: true })
    permissions!: string[];

    @IsOptional()
    @IsUUID('4')
    market_id?: string;
}
