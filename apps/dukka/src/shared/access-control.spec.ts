import { describe, expect, it } from 'vitest';
import {
    ACCESS_CONTROL_ERROR,
    assertActorHasGlobalScope,
    assertActorHasMarketOrGlobalScope,
    assertActorHasScopedAccess,
    resolveActorDistributionPointIds,
    resolveActorWarehouseIds,
    type ScopedAccessActor,
    type StaffScopeRef,
} from './access-control.js';

const globalActor: ScopedAccessActor = {
    scopes: [
        {
            scope_type: 'GLOBAL',
            market_id: null,
            warehouse_id: null,
            distribution_point_id: null,
        },
    ],
    market_ids: [],
};

const marketActor: ScopedAccessActor = {
    scopes: [
        {
            scope_type: 'MARKET',
            market_id: 'market-1',
            warehouse_id: null,
            distribution_point_id: null,
        },
    ],
    market_ids: ['market-1'],
};

const warehouseActor: ScopedAccessActor = {
    scopes: [
        {
            scope_type: 'WAREHOUSE',
            market_id: null,
            warehouse_id: 'wh-1',
            distribution_point_id: null,
        },
    ],
    market_ids: ['market-1'],
};

const dpActor: ScopedAccessActor = {
    scopes: [
        {
            scope_type: 'DISTRIBUTION_POINT',
            market_id: null,
            warehouse_id: null,
            distribution_point_id: 'dp-1',
        },
    ],
    market_ids: ['market-1'],
};

describe('resolveActorWarehouseIds / resolveActorDistributionPointIds', () => {
    it('collects warehouse and distribution point ids from scopes', () => {
        const scopes: StaffScopeRef[] = [
            {
                scope_type: 'WAREHOUSE',
                market_id: null,
                warehouse_id: 'wh-1',
                distribution_point_id: null,
            },
            {
                scope_type: 'WAREHOUSE',
                market_id: null,
                warehouse_id: 'wh-2',
                distribution_point_id: null,
            },
            {
                scope_type: 'DISTRIBUTION_POINT',
                market_id: null,
                warehouse_id: null,
                distribution_point_id: 'dp-1',
            },
            {
                scope_type: 'MARKET',
                market_id: 'market-1',
                warehouse_id: null,
                distribution_point_id: null,
            },
        ];

        expect(resolveActorWarehouseIds(scopes)).toEqual(['wh-1', 'wh-2']);
        expect(resolveActorDistributionPointIds(scopes)).toEqual(['dp-1']);
    });
});

describe('assertActorHasScopedAccess', () => {
    it('allows GLOBAL for any resource', () => {
        expect(() =>
            assertActorHasScopedAccess(globalActor, {
                market_id: 'market-9',
                warehouse_id: 'wh-9',
            }),
        ).not.toThrow();
    });

    it('allows MARKET actor for warehouses and DPs in assigned markets', () => {
        expect(() =>
            assertActorHasScopedAccess(marketActor, {
                market_id: 'market-1',
                warehouse_id: 'wh-any',
            }),
        ).not.toThrow();
        expect(() =>
            assertActorHasScopedAccess(marketActor, {
                market_id: 'market-1',
                distribution_point_id: 'dp-any',
            }),
        ).not.toThrow();
        expect(() =>
            assertActorHasScopedAccess(marketActor, {
                market_id: 'market-1',
            }),
        ).not.toThrow();
    });

    it('denies MARKET actor outside assigned markets', () => {
        expect(() =>
            assertActorHasScopedAccess(marketActor, {
                market_id: 'market-2',
                warehouse_id: 'wh-any',
            }),
        ).toThrow(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
        expect(() =>
            assertActorHasScopedAccess(marketActor, {
                market_id: 'market-2',
            }),
        ).toThrow(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    });

    it('requires market_id when MARKET actor accesses warehouse/DP', () => {
        expect(() =>
            assertActorHasScopedAccess(marketActor, {
                warehouse_id: 'wh-any',
            }),
        ).toThrow(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    });

    it('allows WAREHOUSE actor only for exact warehouse id', () => {
        expect(() =>
            assertActorHasScopedAccess(warehouseActor, {
                market_id: 'market-1',
                warehouse_id: 'wh-1',
            }),
        ).not.toThrow();
        expect(() =>
            assertActorHasScopedAccess(warehouseActor, {
                market_id: 'market-1',
                warehouse_id: 'wh-2',
            }),
        ).toThrow(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    });

    it('allows WAREHOUSE actor market-only via parent market_ids', () => {
        expect(() =>
            assertActorHasScopedAccess(warehouseActor, {
                market_id: 'market-1',
            }),
        ).not.toThrow();
        expect(() =>
            assertActorHasScopedAccess(warehouseActor, {
                market_id: 'market-2',
            }),
        ).toThrow(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    });

    it('denies WAREHOUSE actor for distribution points', () => {
        expect(() =>
            assertActorHasScopedAccess(warehouseActor, {
                market_id: 'market-1',
                distribution_point_id: 'dp-1',
            }),
        ).toThrow(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    });

    it('allows DISTRIBUTION_POINT actor only for exact DP id', () => {
        expect(() =>
            assertActorHasScopedAccess(dpActor, {
                market_id: 'market-1',
                distribution_point_id: 'dp-1',
            }),
        ).not.toThrow();
        expect(() =>
            assertActorHasScopedAccess(dpActor, {
                market_id: 'market-1',
                distribution_point_id: 'dp-2',
            }),
        ).toThrow(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    });

    it('denies DISTRIBUTION_POINT actor for warehouses', () => {
        expect(() =>
            assertActorHasScopedAccess(dpActor, {
                market_id: 'market-1',
                warehouse_id: 'wh-1',
            }),
        ).toThrow(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    });

    it('denies when no resource ids are provided', () => {
        expect(() => assertActorHasScopedAccess(marketActor, {})).toThrow(
            ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS,
        );
    });
});

describe('assertActorHasGlobalScope / assertActorHasMarketOrGlobalScope', () => {
    it('allows only GLOBAL for assertActorHasGlobalScope', () => {
        expect(() => assertActorHasGlobalScope(globalActor)).not.toThrow();
        expect(() => assertActorHasGlobalScope(marketActor)).toThrow(
            ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS,
        );
    });

    it('allows GLOBAL and MARKET for assertActorHasMarketOrGlobalScope', () => {
        expect(() =>
            assertActorHasMarketOrGlobalScope(globalActor),
        ).not.toThrow();
        expect(() =>
            assertActorHasMarketOrGlobalScope(marketActor),
        ).not.toThrow();
        expect(() =>
            assertActorHasMarketOrGlobalScope(warehouseActor),
        ).toThrow(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
    });
});
