import type {
    Qualification,
    Staff,
    StaffProfile,
} from '@app/common';
import type {
    StaffAuditSummary,
    StaffDetailsRow,
    StaffMappedDetails,
    StaffQualificationSummary,
    StaffRoleRow,
    StaffRoleView,
    StaffScopeRow,
    StaffScopeView,
} from '../mappers/staff.mapper.js';

export const STAFF_REPO_ERROR = {
    PERFORMING_STAFF_NOT_FOUND: 'PERFORMING_STAFF_NOT_FOUND',
    ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
    ROLE_NOT_ASSIGNED: 'ROLE_NOT_ASSIGNED',
    MARKETS_NOT_FOUND: 'MARKETS_NOT_FOUND',
    WAREHOUSES_NOT_FOUND: 'WAREHOUSES_NOT_FOUND',
    DISTRIBUTION_POINTS_NOT_FOUND: 'DISTRIBUTION_POINTS_NOT_FOUND',
    SELF_ROLE_ASSIGNMENT: 'SELF_ROLE_ASSIGNMENT',
    SELF_ROLE_REVOCATION: 'SELF_ROLE_REVOCATION',
    SELF_SCOPE_MODIFICATION: 'SELF_SCOPE_MODIFICATION',
    ROLE_SCOPE_MISMATCH: 'ROLE_SCOPE_MISMATCH',
    ALREADY_GLOBAL: 'ALREADY_GLOBAL',
    SELF_DELETION: 'SELF_DELETION',
    STAFF_NOT_FOUND: 'STAFF_NOT_FOUND',
    STAFF_INACTIVE: 'STAFF_INACTIVE',
} as const;

export type { StaffQualificationSummary, StaffRoleView, StaffScopeView };

export type StaffRoleDetails = StaffRoleRow;

export type StaffScopeDetails = StaffScopeRow;

export type StaffWithDetails = StaffDetailsRow;

export type StaffAuthRecord = Staff & {
    profile: StaffProfile | null;
    qualifications: StaffQualificationSummary[];
    role: StaffDetailsRow['role'];
    staff_scopes: StaffDetailsRow['staff_scopes'];
};

export type StaffSummary = {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role_name: string | null;
};

export type LocationStaffBrief = {
    id: string;
    name: string;
    picture: string | null;
};

export type StaffMemberSummary = LocationStaffBrief & {
    role: string | null;
};

export type StaffPage = {
    items: StaffSummary[];
    next_cursor: string | null;
};

export type { StaffAuditSummary };

export type StaffAuditPage = {
    items: StaffAuditSummary[];
    next_cursor: string | null;
};

export type StaffResponse = StaffMappedDetails;

export type StaffSummaryResponse = Omit<StaffSummary, 'avatar'> & {
    avatar: string | null;
};

export type QualificationResponse = Omit<Qualification, 'document_url'> & {
    document_url: string | null;
};
