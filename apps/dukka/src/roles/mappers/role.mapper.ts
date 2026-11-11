import type {
    Permission,
    Role,
    RolePermission,
    ScopeType,
} from '@app/common';

export type RoleSummary = {
    id: string;
    name: string;
    description: string | null;
    hierarchy: number;
    scope_type: ScopeType;
    created_at: Date;
    updated_at: Date;
};

export type RolePermissionView = {
    id: string;
    permission_id: string;
    name: string;
    description: string | null;
    scope_type: ScopeType;
    created_at: Date;
};

export type RoleDetail = RoleSummary & {
    permissions: RolePermissionView[];
};

export function toRoleSummary(role: Role): RoleSummary {
    return {
        id: role.id,
        name: role.name,
        description: role.description,
        hierarchy: role.hierarchy,
        scope_type: role.scope_type,
        created_at: role.created_at,
        updated_at: role.updated_at,
    };
}

export function toRolePermissionView(
    row: RolePermission & { permission: Permission },
): RolePermissionView {
    return {
        id: row.id,
        permission_id: row.permission_id,
        name: row.permission.name,
        description: row.permission.description,
        scope_type: row.permission.scope_type,
        created_at: row.created_at,
    };
}

export function toRoleDetail(role: Role & {
    role_permissions: (RolePermission & { permission: Permission })[];
}): RoleDetail {
    return {
        ...toRoleSummary(role),
        permissions: role.role_permissions.map(toRolePermissionView),
    };
}
