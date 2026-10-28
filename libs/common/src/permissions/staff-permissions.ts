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
        name: 'markets:open',
        description: 'Open markets',
    },
    {
        name: 'markets:close',
        description: 'Close markets',
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
        name: 'service_countries:create',
        description: 'Create service countries',
    },
    {
        name: 'service_countries:update',
        description: 'Update service countries',
    },
    {
        name: 'service_countries:delete',
        description: 'Delete service countries',
    },
    {
        name: 'service_countries:open',
        description: 'Open service countries',
    },
    {
        name: 'service_countries:close',
        description: 'Close service countries',
    },
    {
        name: 'service_countries:assign_market',
        description: 'Assign service countries to markets',
    },
    {
        name: 'service_countries:remove_market',
        description: 'Remove service countries from markets',
    },
    {
        name: 'categories:create',
        description: 'Create product categories and add them to markets',
    },
    {
        name: 'categories:update',
        description: 'Update product categories',
    },
    {
        name: 'categories:delete',
        description: 'Delete product categories or remove them from markets',
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
        name: 'warehouses:open',
        description: 'Open warehouses',
    },
    {
        name: 'service_states:create',
        description: 'Create warehouse service states',
    },
    {
        name: 'service_states:update',
        description:
            'Update warehouse service states and assign them to warehouses',
    },
    {
        name: 'service_states:open',
        description: 'Open warehouse service states',
    },
    {
        name: 'service_states:close',
        description: 'Close warehouse service states',
    },
    {
        name: 'service_states:delete',
        description: 'Delete warehouse service states',
    },
    {
        name: 'inventory:create',
        description: 'Create variant inventory',
    },
    {
        name: 'payments:create',
        description: 'Create payment methods',
    },
    {
        name: 'payments:approve',
        description: 'Approve payment methods for markets',
    },
    {
        name: 'payments:remove',
        description: 'Remove payment methods from markets',
    },
    {
        name: 'payments:read',
        description: 'View payment methods and payment attempts',
    },
    {
        name: 'permissions:read',
        description: 'View permissions',
    },
    {
        name: 'promotions:create',
        description: 'Create promotions',
    },
    {
        name: 'promotions:read',
        description: 'View promotions',
    },
    {
        name: 'promotions:update',
        description:
            'Update promotions, discounts, and promotion market rules',
    },
    {
        name: 'promotions:activate',
        description: 'Activate promotions and promotion markets',
    },
    {
        name: 'promotions:deactivate',
        description: 'Deactivate promotions and promotion markets',
    },
    {
        name: 'coupons:create',
        description: 'Create coupons',
    },
    {
        name: 'coupons:read',
        description: 'View coupons',
    },
    {
        name: 'coupons:update',
        description: 'Update coupons',
    },
    {
        name: 'coupons:activate',
        description: 'Activate coupons',
    },
    {
        name: 'coupons:deactivate',
        description: 'Deactivate coupons',
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
    MarketsOpen: 'markets:open',
    MarketsClose: 'markets:close',
    MarketsDelete: 'markets:delete',
    CurrenciesCreate: 'currencies:create',
    CurrenciesUpdate: 'currencies:update',
    CurrenciesDelete: 'currencies:delete',
    ServiceCountriesCreate: 'service_countries:create',
    ServiceCountriesUpdate: 'service_countries:update',
    ServiceCountriesDelete: 'service_countries:delete',
    ServiceCountriesOpen: 'service_countries:open',
    ServiceCountriesClose: 'service_countries:close',
    ServiceCountriesAssignMarket: 'service_countries:assign_market',
    ServiceCountriesRemoveMarket: 'service_countries:remove_market',
    CategoriesCreate: 'categories:create',
    CategoriesUpdate: 'categories:update',
    CategoriesDelete: 'categories:delete',
    ProductsCreate: 'products:create',
    ProductsUpdate: 'products:update',
    ProductsApprove: 'products:approve',
    ProductsReject: 'products:reject',
    ProductsArchive: 'products:archive',
    WarehousesCreate: 'warehouses:create',
    WarehousesUpdate: 'warehouses:update',
    WarehousesClose: 'warehouses:close',
    WarehousesOpen: 'warehouses:open',
    ServiceStatesCreate: 'service_states:create',
    ServiceStatesUpdate: 'service_states:update',
    ServiceStatesOpen: 'service_states:open',
    ServiceStatesClose: 'service_states:close',
    ServiceStatesDelete: 'service_states:delete',
    InventoryCreate: 'inventory:create',
    PaymentsCreate: 'payments:create',
    PaymentsApprove: 'payments:approve',
    PaymentsRemove: 'payments:remove',
    PaymentsRead: 'payments:read',
    PermissionsRead: 'permissions:read',
    PromotionsCreate: 'promotions:create',
    PromotionsRead: 'promotions:read',
    PromotionsUpdate: 'promotions:update',
    PromotionsActivate: 'promotions:activate',
    PromotionsDeactivate: 'promotions:deactivate',
    CouponsCreate: 'coupons:create',
    CouponsRead: 'coupons:read',
    CouponsUpdate: 'coupons:update',
    CouponsActivate: 'coupons:activate',
    CouponsDeactivate: 'coupons:deactivate',
} as const satisfies Record<string, StaffAccountPermissionName>;
