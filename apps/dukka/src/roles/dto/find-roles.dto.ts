import { IsIn, IsOptional } from 'class-validator';

const SCOPE_TYPES = [
    'GLOBAL',
    'MARKET',
    'WAREHOUSE',
    'DISTRIBUTION_POINT',
] as const;

export class FindRolesDto {
    @IsOptional()
    @IsIn(SCOPE_TYPES)
    scope_type?: (typeof SCOPE_TYPES)[number];
}
