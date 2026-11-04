export type StaffPermissionScopeType =
    | 'GLOBAL'
    | 'MARKET'
    | 'WAREHOUSE'
    | 'DISTRIBUTION_POINT';

export const STAFF_ACCOUNT_PERMISSIONS = [
    {
        name: 'market_admin',
        description:
            'Market administrator; may access warehouse and distribution-point endpoints within assigned markets',
        scope_type: 'MARKET',
    },
    {
        name: 'technical_support',
        description:
            'Technical support; may access warehouse and distribution-point endpoints within assigned markets',
        scope_type: 'MARKET',
    },
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
        name: 'markets:provision',
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
        name: 'market_variants:manage',
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
        name: 'warehouses:create',
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
        name: 'service_states:assign',
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
        name: 'market_payments:manage',
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
    MarketAdmin: 'market_admin',
    TechnicalSupport: 'technical_support',
    StaffManage: 'staff:manage',
    StaffRead: 'staff:read',
    StaffTechnicalSupport: 'staff:technical_support',
    StaffReadAudits: 'staff:read_audits',
    RolesManage: 'roles:manage',
    RolesRead: 'roles:read',
    MarketsProvision: 'markets:provision',
    MarketsManage: 'markets:manage',
    MarketsRead: 'markets:read',
    CurrenciesManage: 'currencies:manage',
    CategoriesManage: 'categories:manage',
    ProductsManage: 'products:manage',
    MarketVariantsManage: 'market_variants:manage',
    ProductsReview: 'products:review',
    WarehousesCreate: 'warehouses:create',
    WarehousesManage: 'warehouses:manage',
    ServiceStatesManage: 'service_states:manage',
    ServiceStatesAssign: 'service_states:assign',
    InventoryManage: 'inventory:manage',
    PaymentsManage: 'payments:manage',
    MarketPaymentsManage: 'market_payments:manage',
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

/** MARKET staff may satisfy lower-scope endpoint permissions with either of these. */
export const MARKET_SCOPE_ELEVATION_PERMISSIONS = [
    StaffPermission.MarketAdmin,
    StaffPermission.TechnicalSupport,
] as const;

const PERMISSION_LAYERS_BY_NAME = STAFF_ACCOUNT_PERMISSIONS.reduce(
    (map, permission) => {
        const layers = map.get(permission.name) ?? [];
        if (!layers.includes(permission.scope_type)) {
            layers.push(permission.scope_type);
        }
        map.set(permission.name, layers);
        return map;
    },
    new Map<string, StaffPermissionScopeType[]>(),
);

function marketStaffHasElevation(permissions: ReadonlySet<string>): boolean {
    return MARKET_SCOPE_ELEVATION_PERMISSIONS.some((permission) =>
        permissions.has(permission),
    );
}

/**
 * Exact match at the same layer, plus higher scopes for lower-layer permissions:
 * - GLOBAL permission → GLOBAL only (exact)
 * - MARKET permission → GLOBAL, or MARKET with exact permission
 * - WAREHOUSE / DISTRIBUTION_POINT → GLOBAL; MARKET with market_admin|technical_support;
 *   same-layer with exact permission
 */
export function staffHasRequiredPermission(
    requiredPermission: string,
    staff: {
        scope_type: StaffPermissionScopeType | null;
        permissions: readonly string[];
    },
): boolean {
    const granted = new Set(staff.permissions);
    const layers = PERMISSION_LAYERS_BY_NAME.get(requiredPermission);

    if (layers === undefined || layers.length === 0) {
        return granted.has(requiredPermission);
    }

    const scope = staff.scope_type;
    if (scope == null) {
        return false;
    }

    const hasExact = granted.has(requiredPermission);

    return layers.some((layer) => {
        switch (layer) {
            case 'GLOBAL':
                return scope === 'GLOBAL' && hasExact;
            case 'MARKET':
                if (scope === 'GLOBAL') {
                    return true;
                }
                return scope === 'MARKET' && hasExact;
            case 'WAREHOUSE':
                if (scope === 'GLOBAL') {
                    return true;
                }
                if (scope === 'MARKET') {
                    return marketStaffHasElevation(granted);
                }
                return scope === 'WAREHOUSE' && hasExact;
            case 'DISTRIBUTION_POINT':
                if (scope === 'GLOBAL') {
                    return true;
                }
                if (scope === 'MARKET') {
                    return marketStaffHasElevation(granted);
                }
                return scope === 'DISTRIBUTION_POINT' && hasExact;
        }
    });
}
