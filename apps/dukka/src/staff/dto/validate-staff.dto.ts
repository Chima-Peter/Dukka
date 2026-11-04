import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsIn,
    IsOptional,
    IsString,
    IsUUID,
    ValidateNested,
} from 'class-validator';

const SCOPE_TYPES = [
    'GLOBAL',
    'MARKET',
    'WAREHOUSE',
    'DISTRIBUTION_POINT',
] as const;

export class ValidateStaffScopeDto {
    @IsIn(SCOPE_TYPES)
    scope_type!: (typeof SCOPE_TYPES)[number];

    @IsOptional()
    @IsUUID('4')
    market_id?: string;

    @IsOptional()
    @IsUUID('4')
    warehouse_id?: string;

    @IsOptional()
    @IsUUID('4')
    distribution_point_id?: string;
}

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
    @ValidateNested()
    @Type(() => ValidateStaffScopeDto)
    scope?: ValidateStaffScopeDto;
}
