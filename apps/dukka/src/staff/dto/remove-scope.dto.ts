import {
    ArrayMinSize,
    IsArray,
    IsIn,
    IsUUID,
    ValidateIf,
} from 'class-validator';

const SCOPE_TYPES = [
    'GLOBAL',
    'MARKET',
    'WAREHOUSE',
    'DISTRIBUTION_POINT',
] as const;

export class RemoveStaffScopeDto {
    @IsIn(SCOPE_TYPES)
    scope_type!: (typeof SCOPE_TYPES)[number];

    @ValidateIf((dto: RemoveStaffScopeDto) => dto.scope_type === 'MARKET')
    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('4', { each: true })
    market_ids?: string[];

    @ValidateIf((dto: RemoveStaffScopeDto) => dto.scope_type === 'WAREHOUSE')
    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('4', { each: true })
    warehouse_ids?: string[];

    @ValidateIf(
        (dto: RemoveStaffScopeDto) => dto.scope_type === 'DISTRIBUTION_POINT',
    )
    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('4', { each: true })
    distribution_point_ids?: string[];
}
