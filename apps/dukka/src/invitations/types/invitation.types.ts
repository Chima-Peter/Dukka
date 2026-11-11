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
    warehouse_id: true,
    distribution_point_id: true,
    warehouse: { select: { market_id: true } },
    distribution_point: { select: { market_id: true } },
} as const;

export {
    invitationDetailsInclude,
    invitationSummarySelect,
    type InvitationResponse,
    type InvitationScopeRow,
    type InvitationSummary,
    type InvitationSummaryRow,
    type StaffInvitationDetailsRow,
} from '../mappers/invitation.mapper.js';

import type {
    InvitationSummaryRow,
    StaffInvitationDetailsRow,
} from '../mappers/invitation.mapper.js';

export type StaffInvitationDetails = StaffInvitationDetailsRow;

export type StaffInvitationPage = {
    items: InvitationSummaryRow[];
    next_cursor: string | null;
};
