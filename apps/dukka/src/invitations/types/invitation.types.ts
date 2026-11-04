import type {
    DistributionPoint,
    Market,
    Role,
    Staff,
    StaffInvitation,
    StaffInvitationScope,
    Warehouse,
} from '@app/common';

export const INVITATION_REPO_ERROR = {
    PERFORMING_STAFF_NOT_FOUND: 'PERFORMING_STAFF_NOT_FOUND',
    ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
    MARKETS_NOT_FOUND: 'MARKETS_NOT_FOUND',
    WAREHOUSES_NOT_FOUND: 'WAREHOUSES_NOT_FOUND',
    DISTRIBUTION_POINTS_NOT_FOUND: 'DISTRIBUTION_POINTS_NOT_FOUND',
    ROLE_SCOPE_MISMATCH: 'ROLE_SCOPE_MISMATCH',
    STAFF_EMAIL_EXISTS: 'STAFF_EMAIL_EXISTS',
    PENDING_INVITATION_EXISTS: 'PENDING_INVITATION_EXISTS',
    INVITATION_NOT_FOUND: 'INVITATION_NOT_FOUND',
    INVITATION_NOT_PENDING: 'INVITATION_NOT_PENDING',
    INVITATION_ALREADY_ACCEPTED: 'INVITATION_ALREADY_ACCEPTED',
    INVITATION_CANCELLED: 'INVITATION_CANCELLED',
    INVITATION_EXPIRED: 'INVITATION_EXPIRED',
    INVITATION_EMAIL_MISMATCH: 'INVITATION_EMAIL_MISMATCH',
    INVITATION_ROLE_UNAVAILABLE: 'INVITATION_ROLE_UNAVAILABLE',
    INVITATION_SCOPES_UNAVAILABLE: 'INVITATION_SCOPES_UNAVAILABLE',
    INVITATION_MARKETS_UNAVAILABLE: 'INVITATION_MARKETS_UNAVAILABLE',
    INVITATION_WAREHOUSES_UNAVAILABLE: 'INVITATION_WAREHOUSES_UNAVAILABLE',
    INVITATION_DISTRIBUTION_POINTS_UNAVAILABLE:
        'INVITATION_DISTRIBUTION_POINTS_UNAVAILABLE',
} as const;

export const invitationScopeAccessSelect = {
    market_id: true,
    scope_type: true,
    warehouse: { select: { market_id: true } },
    distribution_point: { select: { market_id: true } },
} as const;

export type InvitationScopeDetails = StaffInvitationScope & {
    market: Market | null;
    warehouse: Warehouse | null;
    distribution_point: DistributionPoint | null;
};

export type StaffInvitationDetails = StaffInvitation & {
    role: Pick<Role, 'id' | 'name' | 'hierarchy' | 'description'>;
    invited_by: Pick<Staff, 'id' | 'name' | 'email'>;
    invitation_scopes: InvitationScopeDetails[];
};

export type StaffInvitationPage = {
    items: StaffInvitationDetails[];
    next_cursor: string | null;
};

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
        include: {
            market: true,
            warehouse: true,
            distribution_point: true,
        },
        orderBy: { created_at: 'desc' as const },
    },
} as const;
