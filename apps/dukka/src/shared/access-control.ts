export const ACCESS_CONTROL_ERROR = {
    INSUFFICIENT_HIERARCHY: 'INSUFFICIENT_HIERARCHY',
    INSUFFICIENT_MARKET_ACCESS: 'INSUFFICIENT_MARKET_ACCESS',
    MISSING_PERMISSION: 'MISSING_PERMISSION',
} as const;

/**
 * Lower hierarchy number = higher privilege.
 * GET visibility: same level, all lower levels, and one step above.
 */
export function visibleHierarchyFloor(actor_hierarchy: number): number {
    return actor_hierarchy - 1;
}

/**
 * Lower hierarchy number = higher privilege.
 * Actor may only manage targets strictly below their own level.
 */
export function assertCanManageHierarchies(
    actor_hierarchy: number | undefined,
    ...managed_hierarchies: Array<number | undefined>
): void {
    if (actor_hierarchy === undefined) {
        throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_HIERARCHY);
    }

    for (const hierarchy of managed_hierarchies) {
        if (hierarchy !== undefined && hierarchy <= actor_hierarchy) {
            throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_HIERARCHY);
        }
    }
}

export function assertActorBelongsToMarkets(
    actor_market_ids: string[],
    market_ids: string[],
): void {
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
): void {
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

/**
 * Actor must share a market with the target (when the target has markets)
 * and must cover every market being assigned.
 */
export function assertCanManageRoleMarkets(
    actor_market_ids: string[],
    target_market_ids: string[],
    new_role_market_ids: string[],
): void {
    assertCanManageStaffInMarkets(actor_market_ids, target_market_ids);
    assertActorBelongsToMarkets(actor_market_ids, new_role_market_ids);
}

export function assertActorHasPermissions(
    actor_permission_ids: string[],
    permission_ids: string[],
): void {
    const actorPermissions = new Set(actor_permission_ids);

    if (
        actorPermissions.size === 0 ||
        permission_ids.some(
            (permission_id) => !actorPermissions.has(permission_id),
        )
    ) {
        throw new Error(ACCESS_CONTROL_ERROR.MISSING_PERMISSION);
    }
}
