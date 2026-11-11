import type {
    Role,
    ScopeType,
    Staff,
    StaffInvitation,
    StaffInvitationStatus,
} from '@app/common';
import {
    distributionPointBriefSelect,
    marketBriefSelect,
    toStaffScopeView,
    warehouseBriefSelect,
    type DistributionPointBrief,
    type MarketBrief,
    type StaffScopeView,
    type WarehouseBrief,
} from '../../staff/mappers/staff.mapper.js';

export const invitationDetailsInclude = {
    role: {
        select: {
            id: true,
            name: true,
            hierarchy: true,
            description: true,
        },
    },
    invited_by: {
        select: {
            id: true,
            name: true,
            email: true,
        },
    },
    invitation_scopes: {
        select: {
            id: true,
            scope_type: true,
            market_id: true,
            warehouse_id: true,
            distribution_point_id: true,
            created_at: true,
            updated_at: true,
            market: { select: marketBriefSelect },
            warehouse: { select: warehouseBriefSelect },
            distribution_point: { select: distributionPointBriefSelect },
        },
        orderBy: { created_at: 'desc' as const },
    },
} as const;

export type InvitationScopeRow = {
    id: string;
    scope_type: ScopeType;
    market_id: string | null;
    warehouse_id: string | null;
    distribution_point_id: string | null;
    created_at: Date;
    updated_at: Date;
    market: MarketBrief | null;
    warehouse: WarehouseBrief | null;
    distribution_point: DistributionPointBrief | null;
};

export type StaffInvitationDetailsRow = StaffInvitation & {
    role: Pick<Role, 'id' | 'name' | 'hierarchy' | 'description'>;
    invited_by: Pick<Staff, 'id' | 'name' | 'email'>;
    invitation_scopes: InvitationScopeRow[];
    plain_token?: string;
};

export type InvitationResponse = {
    id: string;
    email: string;
    name: string;
    phone_number: string | null;
    status: StaffInvitationStatus;
    expires_at: Date;
    accepted_at: Date | null;
    cancelled_at: Date | null;
    staff_id: string | null;
    role: Pick<Role, 'id' | 'name' | 'hierarchy' | 'description'>;
    invited_by: Pick<Staff, 'id' | 'name' | 'email'>;
    scopes: StaffScopeView[];
    created_at: Date;
    updated_at: Date;
};

export function toInvitationResponse(
    invitation: StaffInvitationDetailsRow,
): InvitationResponse {
    const {
        token: _token,
        plain_token: _plainToken,
        invitation_scopes,
        role_id: _roleId,
        invited_by_staff_id: _invitedByStaffId,
        ...rest
    } = invitation;

    return {
        id: rest.id,
        email: rest.email,
        name: rest.name,
        phone_number: rest.phone_number,
        status: rest.status,
        expires_at: rest.expires_at,
        accepted_at: rest.accepted_at,
        cancelled_at: rest.cancelled_at,
        staff_id: rest.staff_id,
        role: invitation.role,
        invited_by: invitation.invited_by,
        scopes: invitation_scopes.map(toStaffScopeView),
        created_at: rest.created_at,
        updated_at: rest.updated_at,
    };
}
