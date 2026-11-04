import { Type } from 'class-transformer';
import {
    IsEnum,
    IsIn,
    IsInt,
    IsOptional,
    IsUUID,
    Max,
    Min,
    ValidateIf,
} from 'class-validator';
import { StaffInvitationStatus } from '@app/common';

const SCOPE_TYPES = [
    'GLOBAL',
    'MARKET',
    'WAREHOUSE',
    'DISTRIBUTION_POINT',
] as const;

export class FindStaffInvitationsDto {
    @IsOptional()
    @IsEnum(StaffInvitationStatus)
    status?: StaffInvitationStatus;

    @IsOptional()
    @IsIn(SCOPE_TYPES)
    scope_type?: (typeof SCOPE_TYPES)[number];

    @ValidateIf(
        (dto: FindStaffInvitationsDto) =>
            dto.scope_type === undefined || dto.scope_type === 'MARKET',
    )
    @IsOptional()
    @IsUUID()
    market_id?: string;

    @ValidateIf(
        (dto: FindStaffInvitationsDto) =>
            dto.scope_type === undefined || dto.scope_type === 'WAREHOUSE',
    )
    @IsOptional()
    @IsUUID()
    warehouse_id?: string;

    @ValidateIf(
        (dto: FindStaffInvitationsDto) =>
            dto.scope_type === undefined ||
            dto.scope_type === 'DISTRIBUTION_POINT',
    )
    @IsOptional()
    @IsUUID()
    distribution_point_id?: string;

    @IsOptional()
    @IsUUID()
    role_id?: string;

    @IsOptional()
    @IsUUID()
    cursor?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit: number = 20;
}
