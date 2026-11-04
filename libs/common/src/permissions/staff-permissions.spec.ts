import { describe, expect, it } from 'vitest';
import {
    StaffPermission,
    staffHasRequiredPermission,
} from './staff-permissions.js';

describe('staffHasRequiredPermission', () => {
    it('allows GLOBAL only for GLOBAL-layer permissions with exact match', () => {
        expect(
            staffHasRequiredPermission(StaffPermission.CurrenciesManage, {
                scope_type: 'GLOBAL',
                permissions: [StaffPermission.CurrenciesManage],
            }),
        ).toBe(true);
        expect(
            staffHasRequiredPermission(StaffPermission.CurrenciesManage, {
                scope_type: 'MARKET',
                permissions: [StaffPermission.CurrenciesManage],
            }),
        ).toBe(false);
        expect(
            staffHasRequiredPermission(StaffPermission.CurrenciesManage, {
                scope_type: 'GLOBAL',
                permissions: [],
            }),
        ).toBe(false);
    });

    it('allows GLOBAL or exact MARKET for MARKET-layer permissions', () => {
        expect(
            staffHasRequiredPermission(StaffPermission.MarketsManage, {
                scope_type: 'GLOBAL',
                permissions: [],
            }),
        ).toBe(true);
        expect(
            staffHasRequiredPermission(StaffPermission.MarketsManage, {
                scope_type: 'MARKET',
                permissions: [StaffPermission.MarketsManage],
            }),
        ).toBe(true);
        expect(
            staffHasRequiredPermission(StaffPermission.MarketsManage, {
                scope_type: 'MARKET',
                permissions: [StaffPermission.MarketAdmin],
            }),
        ).toBe(false);
        expect(
            staffHasRequiredPermission(StaffPermission.MarketsManage, {
                scope_type: 'WAREHOUSE',
                permissions: [StaffPermission.MarketsManage],
            }),
        ).toBe(false);
    });

    it('allows GLOBAL, elevated MARKET, or exact WAREHOUSE for warehouse permissions', () => {
        expect(
            staffHasRequiredPermission(StaffPermission.InventoryManage, {
                scope_type: 'GLOBAL',
                permissions: [],
            }),
        ).toBe(true);
        expect(
            staffHasRequiredPermission(StaffPermission.InventoryManage, {
                scope_type: 'MARKET',
                permissions: [StaffPermission.MarketAdmin],
            }),
        ).toBe(true);
        expect(
            staffHasRequiredPermission(StaffPermission.InventoryManage, {
                scope_type: 'MARKET',
                permissions: [StaffPermission.TechnicalSupport],
            }),
        ).toBe(true);
        expect(
            staffHasRequiredPermission(StaffPermission.InventoryManage, {
                scope_type: 'MARKET',
                permissions: [StaffPermission.MarketsManage],
            }),
        ).toBe(false);
        expect(
            staffHasRequiredPermission(StaffPermission.InventoryManage, {
                scope_type: 'WAREHOUSE',
                permissions: [StaffPermission.InventoryManage],
            }),
        ).toBe(true);
        expect(
            staffHasRequiredPermission(StaffPermission.InventoryManage, {
                scope_type: 'WAREHOUSE',
                permissions: [],
            }),
        ).toBe(false);
        expect(
            staffHasRequiredPermission(StaffPermission.InventoryManage, {
                scope_type: 'DISTRIBUTION_POINT',
                permissions: [StaffPermission.InventoryManage],
            }),
        ).toBe(false);
    });

    it('falls back to exact match for unknown permission names', () => {
        expect(
            staffHasRequiredPermission('custom:perm', {
                scope_type: 'MARKET',
                permissions: ['custom:perm'],
            }),
        ).toBe(true);
        expect(
            staffHasRequiredPermission('custom:perm', {
                scope_type: 'GLOBAL',
                permissions: [],
            }),
        ).toBe(false);
    });
});
