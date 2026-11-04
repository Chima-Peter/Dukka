export const STAFF_ACCOUNT_PERMISSIONS = [
    {
        name: 'staff:manage',
        description:
            'Invite and deactivate staff; assign or revoke roles and scopes',
        scope_type: 'MARKET',
    },
    {
        name: 'staff:read',
        description: 'View staff members and invitations',
        scope_type: 'MARKET',
    },
    {
        name: 'staff:technical_support',
        description:
            "Manage another staff member's profile, avatar, and qualifications",
        scope_type: 'MARKET',
    },
    {
        name: 'staff:read_audits',
        description: 'View staff audit logs',
        scope_type: 'GLOBAL',
    },
    {
        name: 'staff:read_audits',
        description: 'View staff audit logs',
        scope_type: 'MARKET',
    },
    {
        name: 'roles:manage',
        description:
            'Create, update, and delete roles; assign or remove permissions',
        scope_type: 'GLOBAL',
    },
    {
        name: 'roles:manage',
        description:
            'Create, update, and delete roles; assign or remove permissions',
        scope_type: 'MARKET',
    },
    {
        name: 'roles:read',
        description: 'View roles',
        scope_type: 'GLOBAL',
    },
    {
        name: 'roles:read',
        description: 'View roles',
        scope_type: 'MARKET',
    },
    {
        name: 'markets:manage',
        description: 'Create and delete markets',
        scope_type: 'GLOBAL',
    },
    {
        name: 'markets:manage',
        description: 'Update, open, and close markets',
        scope_type: 'MARKET',
    },
    {
        name: 'markets:read',
        description: 'View markets',
        scope_type: 'MARKET',
    },
    {
        name: 'currencies:manage',
        description: 'Create, update, and delete currencies',
        scope_type: 'GLOBAL',
    },
    {
        name: 'categories:manage',
        description:
            'Create, update, and delete product categories and market links',
        scope_type: 'MARKET',
    },
    {
        name: 'products:manage',
        description:
            'Create, update, and archive products and variants (catalog)',
        scope_type: 'GLOBAL',
    },
    {
        name: 'products:manage',
        description: 'Assign, update, and remove market variants',
        scope_type: 'MARKET',
    },
    {
        name: 'products:review',
        description: 'Approve or reject products and variants',
        scope_type: 'GLOBAL',
    },
    {
        name: 'products:review',
        description: 'Approve or reject products and variants',
        scope_type: 'MARKET',
    },
    {
        name: 'warehouses:manage',
        description: 'Create warehouses',
        scope_type: 'MARKET',
    },
    {
        name: 'warehouses:manage',
        description: 'Update, open, and close warehouses',
        scope_type: 'WAREHOUSE',
    },
    {
        name: 'service_states:manage',
        description: 'Create, open, close, and delete service states',
        scope_type: 'MARKET',
    },
    {
        name: 'service_states:manage',
        description: 'Update service states and assign them to warehouses',
        scope_type: 'WAREHOUSE',
    },
    {
        name: 'inventory:manage',
        description: 'Create and manage variant inventory',
        scope_type: 'WAREHOUSE',
    },
    {
        name: 'payments:manage',
        description: 'Create payment methods',
        scope_type: 'GLOBAL',
    },
    {
        name: 'payments:manage',
        description: 'Remove payment methods from markets',
        scope_type: 'MARKET',
    },
    {
        name: 'payments:review',
        description: 'Approve payment methods for markets',
        scope_type: 'MARKET',
    },
    {
        name: 'payments:read',
        description: 'View payment methods and payment attempts',
        scope_type: 'MARKET',
    },
    {
        name: 'permissions:read',
        description: 'View permissions',
        scope_type: 'GLOBAL',
    },
    {
        name: 'permissions:read',
        description: 'View permissions',
        scope_type: 'MARKET',
    },
    {
        name: 'promotions:manage',
        description: 'Create and update promotions and promotion market rules',
        scope_type: 'MARKET',
    },
    {
        name: 'promotions:read',
        description: 'View promotions',
        scope_type: 'MARKET',
    },
    {
        name: 'promotions:review',
        description: 'Activate or deactivate promotions and promotion markets',
        scope_type: 'MARKET',
    },
    {
        name: 'coupons:manage',
        description: 'Create and update coupons',
        scope_type: 'MARKET',
    },
    {
        name: 'coupons:read',
        description: 'View coupons',
        scope_type: 'MARKET',
    },
    {
        name: 'coupons:review',
        description: 'Activate or deactivate coupons',
        scope_type: 'MARKET',
    },
] as const;

export type StaffAccountPermissionName =
    (typeof STAFF_ACCOUNT_PERMISSIONS)[number]['name'];

export const StaffPermission = {
    StaffManage: 'staff:manage',
    StaffRead: 'staff:read',
    StaffTechnicalSupport: 'staff:technical_support',
    StaffReadAudits: 'staff:read_audits',
    RolesManage: 'roles:manage',
    RolesRead: 'roles:read',
    MarketsManage: 'markets:manage',
    MarketsRead: 'markets:read',
    CurrenciesManage: 'currencies:manage',
    CategoriesManage: 'categories:manage',
    ProductsManage: 'products:manage',
    ProductsReview: 'products:review',
    WarehousesManage: 'warehouses:manage',
    ServiceStatesManage: 'service_states:manage',
    InventoryManage: 'inventory:manage',
    PaymentsManage: 'payments:manage',
    PaymentsReview: 'payments:review',
    PaymentsRead: 'payments:read',
    PermissionsRead: 'permissions:read',
    PromotionsManage: 'promotions:manage',
    PromotionsRead: 'promotions:read',
    PromotionsReview: 'promotions:review',
    CouponsManage: 'coupons:manage',
    CouponsRead: 'coupons:read',
    CouponsReview: 'coupons:review',
} as const satisfies Record<string, StaffAccountPermissionName>;
