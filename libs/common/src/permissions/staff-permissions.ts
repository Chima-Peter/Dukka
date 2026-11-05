export type StaffPermissionScopeType =
    | 'GLOBAL'
    | 'MARKET'
    | 'WAREHOUSE'
    | 'DISTRIBUTION_POINT';

/**
 * Permission catalog. Same name may exist at multiple scopes so each role
 * scope_type can be assigned a matching row. Endpoint checks match by name;
 * higher scopes only pass lower-layer endpoints via explicit elevation grants.
 */
export const STAFF_ACCOUNT_PERMISSIONS = [
    // --- Elevation markers ---
    {
        name: 'platform_admin',
        description:
            'Platform administrator; may access market, warehouse, and distribution-point endpoints without holding each lower-scope permission',
        scope_type: 'GLOBAL',
    },
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

    // --- Staff ---
    {
        name: 'staff:manage',
        description:
            'Invite and deactivate staff; assign or revoke roles and scopes',
        scope_type: 'GLOBAL',
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
        scope_type: 'GLOBAL',
    },
    {
        name: 'staff:read',
        description: 'View staff members and invitations',
        scope_type: 'MARKET',
    },
    {
        name: 'staff:read',
        description: 'View staff members scoped to assigned warehouses',
        scope_type: 'WAREHOUSE',
    },
    {
        name: 'staff:technical_support',
        description:
            "Manage another staff member's profile, avatar, and qualifications",
        scope_type: 'GLOBAL',
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

    // --- Roles & permissions ---
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
        name: 'permissions:read',
        description: 'View permissions',
        scope_type: 'GLOBAL',
    },
    {
        name: 'permissions:read',
        description: 'View permissions',
        scope_type: 'MARKET',
    },

    // --- Markets & currencies ---
    {
        name: 'markets:provision',
        description: 'Create and delete markets',
        scope_type: 'GLOBAL',
    },
    {
        name: 'markets:manage',
        description: 'Update, open, and close markets',
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
        scope_type: 'GLOBAL',
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

    // --- Catalog ---
    {
        name: 'categories:manage',
        description:
            'Create, update, and delete product categories and market links',
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
            'Perform catalog actions: create, update, archive, and propose pending product/variant changes',
        scope_type: 'GLOBAL',
    },
    {
        name: 'products:review',
        description:
            'Review catalog actions: approve or reject products, variants, and pending updates',
        scope_type: 'GLOBAL',
    },
    {
        name: 'products:review',
        description:
            'Review catalog actions: approve or reject products, variants, and pending updates',
        scope_type: 'MARKET',
    },
    {
        name: 'market_variants:manage',
        description: 'Assign, update, and remove market variants',
        scope_type: 'GLOBAL',
    },
    {
        name: 'market_variants:manage',
        description: 'Assign, update, and remove market variants',
        scope_type: 'MARKET',
    },
    {
        name: 'market_variants:read',
        description: 'View market variants',
        scope_type: 'GLOBAL',
    },
    {
        name: 'market_variants:read',
        description: 'View market variants',
        scope_type: 'MARKET',
    },
    {
        name: 'market_variants:read',
        description: 'View market variants',
        scope_type: 'WAREHOUSE',
    },

    // --- Warehouses, service states, inventory ---
    {
        name: 'warehouses:create',
        description: 'Create warehouses',
        scope_type: 'GLOBAL',
    },
    {
        name: 'warehouses:create',
        description: 'Create warehouses',
        scope_type: 'MARKET',
    },
    {
        name: 'warehouses:manage',
        description: 'Update, open, and close warehouses',
        scope_type: 'GLOBAL',
    },
    {
        name: 'warehouses:manage',
        description: 'Update, open, and close warehouses',
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
        scope_type: 'GLOBAL',
    },
    {
        name: 'service_states:manage',
        description: 'Create, open, close, and delete service states',
        scope_type: 'MARKET',
    },
    {
        name: 'service_states:assign',
        description: 'Update service states and assign them to warehouses',
        scope_type: 'GLOBAL',
    },
    {
        name: 'service_states:assign',
        description: 'Update service states and assign them to warehouses',
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
        scope_type: 'GLOBAL',
    },
    {
        name: 'inventory:manage',
        description: 'Create and manage variant inventory',
        scope_type: 'MARKET',
    },
    {
        name: 'inventory:manage',
        description: 'Create and manage variant inventory',
        scope_type: 'WAREHOUSE',
    },

    // --- Payments ---
    {
        name: 'payments:manage',
        description: 'Perform payment-method setup: create payment methods',
        scope_type: 'GLOBAL',
    },
    {
        name: 'market_payments:manage',
        description: 'Remove payment methods from markets',
        scope_type: 'GLOBAL',
    },
    {
        name: 'market_payments:manage',
        description: 'Remove payment methods from markets',
        scope_type: 'MARKET',
    },
    {
        name: 'payments:review',
        description:
            'Review payment-method actions: approve payment methods for markets',
        scope_type: 'GLOBAL',
    },
    {
        name: 'payments:review',
        description:
            'Review payment-method actions: approve payment methods for markets',
        scope_type: 'MARKET',
    },
    {
        name: 'payments:read',
        description: 'View payment methods and payment attempts',
        scope_type: 'GLOBAL',
    },
    {
        name: 'payments:read',
        description: 'View payment methods and payment attempts',
        scope_type: 'MARKET',
    },

    // --- Promotions ---
    {
        name: 'promotions:manage',
        description:
            'Perform promotion actions: create and update promotions and market rules',
        scope_type: 'GLOBAL',
    },
    {
        name: 'promotions:manage',
        description:
            'Perform promotion actions: create and update promotions and market rules',
        scope_type: 'MARKET',
    },
    {
        name: 'promotions:read',
        description: 'View promotions',
        scope_type: 'GLOBAL',
    },
    {
        name: 'promotions:read',
        description: 'View promotions',
        scope_type: 'MARKET',
    },
    {
        name: 'promotions:review',
        description:
            'Review promotion actions: activate or deactivate promotions and markets',
        scope_type: 'GLOBAL',
    },
    {
        name: 'promotions:review',
        description:
            'Review promotion actions: activate or deactivate promotions and markets',
        scope_type: 'MARKET',
    },

    // --- Coupons ---
    {
        name: 'coupons:manage',
        description: 'Perform coupon actions: create and update coupons',
        scope_type: 'GLOBAL',
    },
    {
        name: 'coupons:manage',
        description: 'Perform coupon actions: create and update coupons',
        scope_type: 'MARKET',
    },
    {
        name: 'coupons:read',
        description: 'View coupons',
        scope_type: 'GLOBAL',
    },
    {
        name: 'coupons:read',
        description: 'View coupons',
        scope_type: 'MARKET',
    },
    {
        name: 'coupons:review',
        description: 'Review coupon actions: activate or deactivate coupons',
        scope_type: 'GLOBAL',
    },
    {
        name: 'coupons:review',
        description: 'Review coupon actions: activate or deactivate coupons',
        scope_type: 'MARKET',
    },
] as const;

export type StaffAccountPermissionName =
    (typeof STAFF_ACCOUNT_PERMISSIONS)[number]['name'];

export const StaffPermission = {
    PlatformAdmin: 'platform_admin',
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
    MarketVariantsRead: 'market_variants:read',
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

/** GLOBAL staff may satisfy WAREHOUSE / DP endpoint permissions with this. */
export const GLOBAL_SCOPE_ELEVATION_PERMISSIONS = [
    StaffPermission.PlatformAdmin,
] as const;

/** MARKET staff may satisfy WAREHOUSE / DP endpoint permissions with either of these. */
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

function hasAnyPermission(
    granted: ReadonlySet<string>,
    permissions: readonly string[],
): boolean {
    return permissions.some((permission) => granted.has(permission));
}

/**
 * Access requires the exact permission name, or an explicit elevation grant:
 * - exact match → allow (role already constrained to assignable scope rows)
 * - GLOBAL + platform_admin → may satisfy WAREHOUSE / DP-layer permissions only
 * - MARKET + market_admin|technical_support → may satisfy WAREHOUSE / DP-layer permissions
 * MARKET-layer and review endpoints always need the exact permission (no silent bypass).
 */
export function staffHasRequiredPermission(
    requiredPermission: string,
    staff: {
        scope_type: StaffPermissionScopeType | null;
        permissions: readonly string[];
    },
): boolean {
    const granted = new Set(staff.permissions);
    const scope = staff.scope_type;
    if (scope == null) {
        return false;
    }

    if (granted.has(requiredPermission)) {
        return true;
    }

    const layers = PERMISSION_LAYERS_BY_NAME.get(requiredPermission);
    if (layers === undefined || layers.length === 0) {
        return false;
    }

    const touchesWarehouseOrBelow = layers.some(
        (layer) =>
            layer === 'WAREHOUSE' || layer === 'DISTRIBUTION_POINT',
    );
    if (!touchesWarehouseOrBelow) {
        return false;
    }

    if (
        scope === 'GLOBAL' &&
        hasAnyPermission(granted, GLOBAL_SCOPE_ELEVATION_PERMISSIONS)
    ) {
        return true;
    }

    if (
        scope === 'MARKET' &&
        hasAnyPermission(granted, MARKET_SCOPE_ELEVATION_PERMISSIONS)
    ) {
        return true;
    }

    return false;
}
