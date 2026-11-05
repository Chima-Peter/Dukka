import { describe, expect, it } from 'vitest';
import {
    StaffPermission,
    staffHasRequiredPermission,
} from './staff-permissions.js';

describe('staffHasRequiredPermission', () => {
    it('requires exact permission for GLOBAL-only permissions', () => {
        expect(
            staffHasRequiredPermission(StaffPermission.CurrenciesManage, {
                scope_type: 'GLOBAL',
                permissions: [StaffPermission.CurrenciesManage],
            }),
        ).toBe(true);
        expect(
            staffHasRequiredPermission(StaffPermission.CurrenciesManage, {
                scope_type: 'GLOBAL',
                permissions: [StaffPermission.PlatformAdmin],
            }),
        ).toBe(false);
        expect(
            staffHasRequiredPermission(StaffPermission.CurrenciesManage, {
                scope_type: 'MARKET',
                permissions: [StaffPermission.CurrenciesManage],
            }),
        ).toBe(true);
    });

    it('blocks MARKET permissions without the exact grant', () => {
        expect(
            staffHasRequiredPermission(StaffPermission.MarketsManage, {
                scope_type: 'GLOBAL',
                permissions: [],
            }),
        ).toBe(false);
        expect(
            staffHasRequiredPermission(StaffPermission.MarketsManage, {
                scope_type: 'GLOBAL',
                permissions: [StaffPermission.PlatformAdmin],
            }),
        ).toBe(false);
        expect(
            staffHasRequiredPermission(StaffPermission.MarketsManage, {
                scope_type: 'GLOBAL',
                permissions: [StaffPermission.MarketsManage],
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
    });

    it('does not let manage or platform_admin imply review', () => {
        expect(
            staffHasRequiredPermission(StaffPermission.ProductsReview, {
                scope_type: 'GLOBAL',
                permissions: [StaffPermission.ProductsManage],
            }),
        ).toBe(false);
        expect(
            staffHasRequiredPermission(StaffPermission.ProductsReview, {
                scope_type: 'GLOBAL',
                permissions: [StaffPermission.PlatformAdmin],
            }),
        ).toBe(false);
        expect(
            staffHasRequiredPermission(StaffPermission.ProductsReview, {
                scope_type: 'GLOBAL',
                permissions: [StaffPermission.ProductsReview],
            }),
        ).toBe(true);
    });

    it('allows warehouse permissions via exact grant or elevation only', () => {
        expect(
            staffHasRequiredPermission(StaffPermission.InventoryManage, {
                scope_type: 'GLOBAL',
                permissions: [],
            }),
        ).toBe(false);
        expect(
            staffHasRequiredPermission(StaffPermission.InventoryManage, {
                scope_type: 'GLOBAL',
                permissions: [StaffPermission.InventoryManage],
            }),
        ).toBe(true);
        expect(
            staffHasRequiredPermission(StaffPermission.InventoryManage, {
                scope_type: 'GLOBAL',
                permissions: [StaffPermission.PlatformAdmin],
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
                permissions: [StaffPermission.PlatformAdmin],
            }),
        ).toBe(false);
    });
});
