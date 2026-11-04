import type {
    DistributionPoint,
    Market,
    Permission,
    Qualification,
    Role,
    RolePermission,
    Staff,
    StaffAudit,
    StaffProfile,
    StaffScope,
    Warehouse,
} from '@app/common';

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

export type StaffRoleDetails = Role & {
    role_permissions: (RolePermission & { permission: Permission })[];
};

export type StaffQualificationSummary = Omit<Qualification, 'document_url'>;

export type StaffScopeDetails = StaffScope & {
    market: Market | null;
    warehouse: Warehouse | null;
    distribution_point: DistributionPoint | null;
};

export type StaffWithDetails = Omit<Staff, 'password'> & {
    profile: StaffProfile | null;
    qualifications: StaffQualificationSummary[];
    role: StaffRoleDetails | null;
    staff_scopes: StaffScopeDetails[];
};

export type StaffAuthRecord = Staff & {
    profile: StaffProfile | null;
    qualifications: StaffQualificationSummary[];
    role: StaffRoleDetails | null;
    staff_scopes: StaffScopeDetails[];
};

export type StaffSummary = {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role_name: string | null;
};

export type StaffPage = {
    items: StaffSummary[];
    next_cursor: string | null;
};

export type StaffAuditPage = {
    items: StaffAudit[];
    next_cursor: string | null;
};

export type StaffResponse = Omit<
    StaffWithDetails,
    'avatar' | 'staff_scopes'
> & {
    scopes: StaffWithDetails['staff_scopes'];
    /** Public Supabase URL built from the stored avatar path. */
    avatar: string | null;
};

export type StaffSummaryResponse = Omit<StaffSummary, 'avatar'> & {
    avatar: string | null;
};

export type QualificationResponse = Omit<Qualification, 'document_url'> & {
    document_url: string | null;
};
