import type { ScopeType } from '@app/common';

export const ACCESS_CONTROL_ERROR = {
    INSUFFICIENT_HIERARCHY: 'INSUFFICIENT_HIERARCHY',
    INSUFFICIENT_MARKET_ACCESS: 'INSUFFICIENT_MARKET_ACCESS',
    INSUFFICIENT_SCOPE_ACCESS: 'INSUFFICIENT_SCOPE_ACCESS',
} as const;

const ALL_SCOPE_TYPES: ScopeType[] = [
    'GLOBAL',
    'MARKET',
    'WAREHOUSE',
    'DISTRIBUTION_POINT',
];

/** Role/scope types an actor may mutate (assign, create, update, delete). */
const MANAGEABLE_SCOPE_TYPES: Record<ScopeType, readonly ScopeType[]> = {
    GLOBAL: ALL_SCOPE_TYPES,
    MARKET: ['MARKET', 'WAREHOUSE', 'DISTRIBUTION_POINT'],
    WAREHOUSE: [],
    DISTRIBUTION_POINT: [],
};

/**
 * Role scope types visible to the actor.
 * Warehouse / DP can still read same-scope roles; they cannot manage them.
 */
export function visibleRoleScopeTypes(
    actor_scope: ScopeType | null | undefined,
): ScopeType[] | null {
    if (actor_scope == null) {
        return null;
    }
    if (actor_scope === 'GLOBAL' || actor_scope === 'MARKET') {
        return [...MANAGEABLE_SCOPE_TYPES[actor_scope]];
    }
    return [actor_scope];
}

/**
 * Optional list filter: GLOBAL/MARKET may narrow to any visible scope
 * (e.g. market → warehouse). Warehouse/DP may only request their own.
 */
export function resolveQueriedRoleScopeTypes(
    actor_scope: ScopeType | null | undefined,
    filter_scope?: ScopeType | null,
): ScopeType[] | null {
    const visible = visibleRoleScopeTypes(actor_scope);
    if (visible === null) {
        return null;
    }
    if (filter_scope == null) {
        return visible;
    }
    if (!visible.includes(filter_scope)) {
        throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    }
    return [filter_scope];
}

/** Resource filters an actor may use when listing scoped resources. */
const OPERABLE_SCOPE_FILTERS: Record<
    ScopeType,
    ReadonlySet<'market_id' | 'warehouse_id' | 'distribution_point_id'>
> = {
    GLOBAL: new Set(['market_id', 'warehouse_id', 'distribution_point_id']),
    MARKET: new Set(['market_id', 'warehouse_id', 'distribution_point_id']),
    WAREHOUSE: new Set(['warehouse_id']),
    DISTRIBUTION_POINT: new Set(['distribution_point_id']),
};

export function assertOperableScopeFilters(
    actor_scope: ScopeType | null | undefined,
    filters: {
        market_id?: string;
        warehouse_id?: string;
        distribution_point_id?: string;
    },
): void {
    if (actor_scope == null) {
        throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    }

    const operable = OPERABLE_SCOPE_FILTERS[actor_scope];
    if (filters.market_id !== undefined && !operable.has('market_id')) {
        throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    }
    if (filters.warehouse_id !== undefined && !operable.has('warehouse_id')) {
        throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    }
    if (
        filters.distribution_point_id !== undefined &&
        !operable.has('distribution_point_id')
    ) {
        throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    }
}

/**
 * Lower hierarchy number = higher privilege.
 * GET visibility: same level, all lower levels, and one step above.
 */
export function visibleHierarchyFloor(actor_hierarchy: number): number {
    return actor_hierarchy - 1;
}

export type RoleAccessRef = {
    hierarchy?: number;
    scope_type?: ScopeType | null;
};

/**
 * Hierarchy is unique per scope_type.
 * Actor may only manage allowed scopes, and within the same scope
 * only targets with a strictly lower privilege (higher hierarchy number).
 */
export function assertCanManageRole(
    actor: RoleAccessRef,
    ...targets: RoleAccessRef[]
): void {
    if (actor.hierarchy === undefined || actor.scope_type == null) {
        throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    }

    const allowed = new Set(MANAGEABLE_SCOPE_TYPES[actor.scope_type]);
    if (allowed.size === 0) {
        throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    }

    for (const target of targets) {
        if (target.scope_type != null && !allowed.has(target.scope_type)) {
            throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
        }

        const sameScope =
            target.scope_type == null || target.scope_type === actor.scope_type;
        if (
            sameScope &&
            target.hierarchy !== undefined &&
            target.hierarchy <= actor.hierarchy
        ) {
            throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_HIERARCHY);
        }
    }
}

export function hasGlobalScope(
    scopes: ReadonlyArray<{ scope_type: ScopeType }>,
): boolean {
    return scopes.some((scope) => scope.scope_type === 'GLOBAL');
}

/**
 * Concrete market ids from scopes. GLOBAL has no market list.
 * WAREHOUSE / DISTRIBUTION_POINT use nested parent market_id when selected.
 */
export function resolveScopeMarketIds(
    scopes: Array<{
        scope_type: ScopeType;
        market_id: string | null;
        warehouse?: { market_id: string } | null;
        distribution_point?: { market_id: string } | null;
    }>,
): string[] {
    if (hasGlobalScope(scopes)) {
        return [];
    }

    const marketIds = new Set<string>();
    for (const scope of scopes) {
        if (scope.market_id != null) {
            marketIds.add(scope.market_id);
        }
        if (scope.warehouse?.market_id != null) {
            marketIds.add(scope.warehouse.market_id);
        }
        if (scope.distribution_point?.market_id != null) {
            marketIds.add(scope.distribution_point.market_id);
        }
    }
    return [...marketIds];
}

export type RequiredStaffScope = {
    scope_type: ScopeType;
    market_id?: string;
    warehouse_id?: string;
    distribution_point_id?: string;
};

export type StaffScopeRef = {
    scope_type: ScopeType;
    market_id: string | null;
    warehouse_id: string | null;
    distribution_point_id: string | null;
};

export type ScopedAccessActor = {
    scopes: readonly StaffScopeRef[];
    market_ids: readonly string[];
};

export function toScopedAccessActor(staff: {
    scopes: readonly StaffScopeRef[];
    market_ids: readonly string[];
}): ScopedAccessActor {
    return { scopes: staff.scopes, market_ids: staff.market_ids };
}

export type ScopedAccessResource = {
    market_id?: string;
    warehouse_id?: string;
    distribution_point_id?: string;
};

export function resolveActorWarehouseIds(
    scopes: readonly StaffScopeRef[],
): string[] {
    const ids = new Set<string>();
    for (const scope of scopes) {
        if (
            scope.scope_type === 'WAREHOUSE' &&
            scope.warehouse_id != null
        ) {
            ids.add(scope.warehouse_id);
        }
    }
    return [...ids];
}

export function resolveActorDistributionPointIds(
    scopes: readonly StaffScopeRef[],
): string[] {
    const ids = new Set<string>();
    for (const scope of scopes) {
        if (
            scope.scope_type === 'DISTRIBUTION_POINT' &&
            scope.distribution_point_id != null
        ) {
            ids.add(scope.distribution_point_id);
        }
    }
    return [...ids];
}

function actorHasMarketScope(scopes: readonly StaffScopeRef[]): boolean {
    return scopes.some((scope) => scope.scope_type === 'MARKET');
}

/** Platform-wide catalog mutations that are not market-bound. */
export function assertActorHasGlobalScope(actor: ScopedAccessActor): void {
    if (hasGlobalScope(actor.scopes)) {
        return;
    }
    throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
}

/**
 * Catalog review / platform pending-update flows:
 * GLOBAL or MARKET actors only (WAREHOUSE / DP denied).
 */
export function assertActorHasMarketOrGlobalScope(
    actor: ScopedAccessActor,
): void {
    if (hasGlobalScope(actor.scopes) || actorHasMarketScope(actor.scopes)) {
        return;
    }
    throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
}

function actorOwnsMarket(
    actor: ScopedAccessActor,
    market_id: string,
): boolean {
    return actor.market_ids.includes(market_id);
}

/**
 * Hierarchical resource access:
 * GLOBAL → any resource
 * MARKET → any warehouse/DP under assigned markets
 * WAREHOUSE / DISTRIBUTION_POINT → only exact assigned ids
 * Market-only resources: WH/DP may access when market_id is in parent-derived market_ids
 */
export function assertActorHasScopedAccess(
    actor: ScopedAccessActor,
    resource: ScopedAccessResource,
): void {
    if (hasGlobalScope(actor.scopes)) {
        return;
    }

    const ownedWarehouses = new Set(resolveActorWarehouseIds(actor.scopes));
    const ownedDistributionPoints = new Set(
        resolveActorDistributionPointIds(actor.scopes),
    );
    const isMarketActor = actorHasMarketScope(actor.scopes);

    if (resource.warehouse_id !== undefined) {
        if (ownedWarehouses.has(resource.warehouse_id)) {
            return;
        }
        if (
            isMarketActor &&
            resource.market_id !== undefined &&
            actorOwnsMarket(actor, resource.market_id)
        ) {
            return;
        }
        throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    }

    if (resource.distribution_point_id !== undefined) {
        if (ownedDistributionPoints.has(resource.distribution_point_id)) {
            return;
        }
        if (
            isMarketActor &&
            resource.market_id !== undefined &&
            actorOwnsMarket(actor, resource.market_id)
        ) {
            return;
        }
        throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    }

    if (resource.market_id !== undefined) {
        if (actorOwnsMarket(actor, resource.market_id)) {
            return;
        }
        throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    }

    throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
}

/**
 * GLOBAL staff match any required scope.
 * With a resource id, staff must have that exact staff_scope row.
 * Without a resource id, staff role.scope_type must match the required type.
 */
export function staffMatchesRequiredScope(
    scopes: StaffScopeRef[],
    required: RequiredStaffScope,
    role_scope_type?: ScopeType | null,
): boolean {
    if (hasGlobalScope(scopes)) {
        return true;
    }

    switch (required.scope_type) {
        case 'GLOBAL':
            return false;
        case 'MARKET':
            if (required.market_id !== undefined) {
                return scopes.some(
                    (scope) =>
                        scope.scope_type === 'MARKET' &&
                        scope.market_id === required.market_id,
                );
            }
            return role_scope_type === 'MARKET';
        case 'WAREHOUSE':
            if (required.warehouse_id !== undefined) {
                return scopes.some(
                    (scope) =>
                        scope.scope_type === 'WAREHOUSE' &&
                        scope.warehouse_id === required.warehouse_id,
                );
            }
            return role_scope_type === 'WAREHOUSE';
        case 'DISTRIBUTION_POINT':
            if (required.distribution_point_id !== undefined) {
                return scopes.some(
                    (scope) =>
                        scope.scope_type === 'DISTRIBUTION_POINT' &&
                        scope.distribution_point_id ===
                            required.distribution_point_id,
                );
            }
            return role_scope_type === 'DISTRIBUTION_POINT';
    }
}

export function assertActorBelongsToMarkets(
    actor_market_ids: string[],
    market_ids: string[],
    actor_is_global = false,
): void {
    if (actor_is_global) {
        return;
    }

    const actorMarkets = new Set(actor_market_ids);

    if (
        actorMarkets.size === 0 ||
        market_ids.some((market_id) => !actorMarkets.has(market_id))
    ) {
        throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_MARKET_ACCESS);
    }
}

/**
 * Actor must share at least one market with the target staff
 * (when the target already has markets).
 */
export function assertCanManageStaffInMarkets(
    actor_market_ids: string[],
    target_market_ids: string[],
    actor_is_global = false,
): void {
    if (actor_is_global) {
        return;
    }

    const actorMarkets = new Set(actor_market_ids);

    if (actorMarkets.size === 0) {
        throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_MARKET_ACCESS);
    }

    if (
        target_market_ids.length > 0 &&
        !target_market_ids.some((market_id) => actorMarkets.has(market_id))
    ) {
        throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_MARKET_ACCESS);
    }
}

