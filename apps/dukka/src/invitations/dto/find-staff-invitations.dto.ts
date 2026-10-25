import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsUUID,
    Max,
    Min,
} from 'class-validator';
import { StaffInvitationStatus } from '@app/common';

export class FindStaffInvitationsDto {
    @IsOptional()
    @IsEnum(StaffInvitationStatus)
    status?: StaffInvitationStatus;

    @IsOptional()
    @IsUUID()
    market_id?: string;

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
