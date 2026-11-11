import type {
    MarketStatus,
    Permission,
    Prisma,
    Qualification,
    Role,
    ScopeType,
    Staff,
    StaffAuditAction,
    StaffProfile,
    WarehouseStatus,
} from '@app/common';

export const marketBriefSelect = {
    id: true,
    name: true,
    code: true,
    status: true,
} as const;

export const warehouseBriefSelect = {
    id: true,
    name: true,
    market_id: true,
    status: true,
} as const;

export const distributionPointBriefSelect = {
    id: true,
    name: true,
    market_id: true,
    is_active: true,
} as const;

export const permissionBriefSelect = {
    id: true,
    name: true,
    description: true,
    scope_type: true,
} as const;

export const staffQualificationSelect = {
    id: true,
    title: true,
    description: true,
    created_at: true,
    updated_at: true,
    staff_id: true,
} as const;

export const staffDetailsInclude = {
    profile: true,
    qualifications: {
        orderBy: { created_at: 'desc' as const },
        select: staffQualificationSelect,
    },
    staff_scopes: {
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
    role: {
        include: {
            role_permissions: {
                select: {
                    id: true,
                    permission_id: true,
                    created_at: true,
                    permission: { select: permissionBriefSelect },
                },
                orderBy: { created_at: 'desc' as const },
            },
        },
    },
} as const;

export type MarketBrief = {
    id: string;
    name: string;
    code: string;
    status: MarketStatus;
};

export type WarehouseBrief = {
    id: string;
    name: string;
    market_id: string;
    status: WarehouseStatus;
};

export type DistributionPointBrief = {
    id: string;
    name: string;
    market_id: string;
    is_active: boolean;
};

export type StaffScopeView = {
    id: string;
    scope_type: ScopeType;
    market_id: string | null;
    warehouse_id: string | null;
    distribution_point_id: string | null;
    market: MarketBrief | null;
    warehouse: WarehouseBrief | null;
    distribution_point: DistributionPointBrief | null;
    created_at: Date;
    updated_at: Date;
};

export type StaffPermissionView = {
    id: string;
    permission_id: string;
    name: string;
    description: string | null;
    scope_type: ScopeType;
    created_at: Date;
};

export type StaffRoleView = {
    id: string;
    name: string;
    description: string | null;
    hierarchy: number;
    scope_type: ScopeType;
    created_at: Date;
    updated_at: Date;
    permissions: StaffPermissionView[];
};

export type StaffQualificationSummary = Omit<Qualification, 'document_url'>;

export type StaffMappedDetails = Omit<Staff, 'password' | 'avatar'> & {
    avatar: string | null;
    profile: StaffProfile | null;
    qualifications: StaffQualificationSummary[];
    role: StaffRoleView | null;
    scopes: StaffScopeView[];
};

export type StaffScopeRow = {
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

export type StaffRoleRow = Role & {
    role_permissions: Array<{
        id: string;
        permission_id: string;
        created_at: Date;
        permission: Pick<
            Permission,
            'id' | 'name' | 'description' | 'scope_type'
        >;
    }>;
};

export type StaffDetailsRow = Omit<Staff, 'password'> & {
    profile: StaffProfile | null;
    qualifications: StaffQualificationSummary[];
    role: StaffRoleRow | null;
    staff_scopes: StaffScopeRow[];
};

export function toStaffScopeView(scope: StaffScopeRow): StaffScopeView {
    return {
        id: scope.id,
        scope_type: scope.scope_type,
        market_id: scope.market_id,
        warehouse_id: scope.warehouse_id,
        distribution_point_id: scope.distribution_point_id,
        market: scope.market,
        warehouse: scope.warehouse,
        distribution_point: scope.distribution_point,
        created_at: scope.created_at,
        updated_at: scope.updated_at,
    };
}

export function toStaffRoleView(role: StaffRoleRow): StaffRoleView {
    return {
        id: role.id,
        name: role.name,
        description: role.description,
        hierarchy: role.hierarchy,
        scope_type: role.scope_type,
        created_at: role.created_at,
        updated_at: role.updated_at,
        permissions: role.role_permissions.map((row) => ({
            id: row.id,
            permission_id: row.permission_id,
            name: row.permission.name,
            description: row.permission.description,
            scope_type: row.permission.scope_type,
            created_at: row.created_at,
        })),
    };
}

export function toStaffMappedDetails(
    staff: StaffDetailsRow,
    avatarUrl: string | null,
): StaffMappedDetails {
    const { staff_scopes, role, avatar: _avatar, ...rest } = staff;
    return {
        ...rest,
        avatar: avatarUrl,
        role: role ? toStaffRoleView(role) : null,
        scopes: staff_scopes.map(toStaffScopeView),
    };
}

export const staffAuditSummarySelect = {
    id: true,
    action: true,
    created_at: true,
    staff_name: true,
    performed_by_staff_name: true,
    role_name: true,
    market_name: true,
} satisfies Prisma.StaffAuditSelect;

export type StaffAuditSummary = {
    id: string;
    action: StaffAuditAction;
    created_at: Date;
    staff_name: string | null;
    performed_by_staff_name: string;
    role_name: string | null;
    market_name: string | null;
};

type StaffAuditSummaryRow = Prisma.StaffAuditGetPayload<{
    select: typeof staffAuditSummarySelect;
}>;

export function toStaffAuditSummary(
    row: StaffAuditSummaryRow,
): StaffAuditSummary {
    return {
        id: row.id,
        action: row.action,
        created_at: row.created_at,
        staff_name: row.staff_name,
        performed_by_staff_name: row.performed_by_staff_name,
        role_name: row.role_name,
        market_name: row.market_name,
    };
}
