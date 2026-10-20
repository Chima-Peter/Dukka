export const STAFF_ACCOUNT_PERMISSIONS = [
    {
        name: 'staff:create',
        description: 'Invite staff members',
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
        name: 'staff:revoke_role',
        description: 'Revoke roles from staff members',
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
        name: 'currencies:create',
        description: 'Create currencies',
    },
    {
        name: 'currencies:update',
        description: 'Update currencies',
    },
    {
        name: 'currencies:delete',
        description: 'Delete currencies',
    },
    {
        name: 'products:create',
        description: 'Create products',
    },
    {
        name: 'products:update',
        description: 'Update products',
    },
    {
        name: 'products:approve',
        description: 'Approve products',
    },
    {
        name: 'products:reject',
        description: 'Reject products',
    },
    {
        name: 'products:archive',
        description: 'Archive products',
    },
    {
        name: 'warehouses:create',
        description: 'Create warehouses',
    },
    {
        name: 'warehouses:update',
        description: 'Update warehouses',
    },
    {
        name: 'warehouses:close',
        description: 'Close warehouses',
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
    StaffRevokeRole: 'staff:revoke_role',
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
    CurrenciesCreate: 'currencies:create',
    CurrenciesUpdate: 'currencies:update',
    CurrenciesDelete: 'currencies:delete',
    ProductsCreate: 'products:create',
    ProductsUpdate: 'products:update',
    ProductsApprove: 'products:approve',
    ProductsReject: 'products:reject',
    ProductsArchive: 'products:archive',
    WarehousesCreate: 'warehouses:create',
    WarehousesUpdate: 'warehouses:update',
    WarehousesClose: 'warehouses:close',
    PermissionsRead: 'permissions:read',
} as const satisfies Record<string, StaffAccountPermissionName>;
