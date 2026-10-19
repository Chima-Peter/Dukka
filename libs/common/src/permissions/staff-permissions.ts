export const STAFF_ACCOUNT_PERMISSIONS = [
    {
        name: 'staff:create',
        description: 'Create staff members',
    },
    {
        name: 'staff:read',
        description: 'View staff members',
    },
    {
        name: 'staff:delete',
        description: 'Deactivate staff members',
    },
    {
        name: 'staff:assign_role',
        description: 'Assign roles to staff members',
    },
    {
        name: 'staff:assign_markets',
        description: 'Assign markets to staff members',
    },
    {
        name: 'staff:remove_markets',
        description: 'Remove markets from staff members',
    },
    {
        name: 'staff:read_audits',
        description: 'View staff audit logs',
    },
    {
        name: 'staff:technical_support',
        description:
            "Manage another staff member's profile, avatar, and qualifications",
    },
    {
        name: 'roles:create',
        description: 'Create roles',
    },
    {
        name: 'roles:read',
        description: 'View roles',
    },
    {
        name: 'roles:update',
        description: 'Update roles',
    },
    {
        name: 'roles:delete',
        description: 'Delete roles',
    },
    {
        name: 'roles:assign_permissions',
        description: 'Assign permissions to roles',
    },
    {
        name: 'roles:remove_permissions',
        description: 'Remove permissions from roles',
    },
    {
        name: 'roles:assign_markets',
        description: 'Assign markets to roles',
    },
    {
        name: 'roles:remove_markets',
        description: 'Remove markets from roles',
    },
    {
        name: 'markets:create',
        description: 'Create markets',
    },
    {
        name: 'markets:read',
        description: 'View markets',
    },
    {
        name: 'markets:update',
        description: 'Update markets',
    },
    {
        name: 'markets:delete',
        description: 'Delete markets',
    },
    {
        name: 'permissions:read',
        description: 'View permissions',
    },
] as const;

export type StaffAccountPermissionName =
    (typeof STAFF_ACCOUNT_PERMISSIONS)[number]['name'];

export const StaffPermission = {
    StaffCreate: 'staff:create',
    StaffRead: 'staff:read',
    StaffDelete: 'staff:delete',
    StaffAssignRole: 'staff:assign_role',
    StaffAssignMarkets: 'staff:assign_markets',
    StaffRemoveMarkets: 'staff:remove_markets',
    StaffReadAudits: 'staff:read_audits',
    StaffTechnicalSupport: 'staff:technical_support',
    RolesCreate: 'roles:create',
    RolesRead: 'roles:read',
    RolesUpdate: 'roles:update',
    RolesDelete: 'roles:delete',
    RolesAssignPermissions: 'roles:assign_permissions',
    RolesRemovePermissions: 'roles:remove_permissions',
    RolesAssignMarkets: 'roles:assign_markets',
    RolesRemoveMarkets: 'roles:remove_markets',
    MarketsCreate: 'markets:create',
    MarketsRead: 'markets:read',
    MarketsUpdate: 'markets:update',
    MarketsDelete: 'markets:delete',
    PermissionsRead: 'permissions:read',
} as const satisfies Record<string, StaffAccountPermissionName>;
