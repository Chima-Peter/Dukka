import type { Prisma, WarehouseStatus } from '@app/common';
import { ScopeType } from '@app/common';
import type { LocationStaffBrief } from '../../staff/types/staff.types.js';

export const warehouseSummarySelect = {
    id: true,
    name: true,
    market_id: true,
    manager_id: true,
    address: true,
    status: true,
    created_at: true,
} satisfies Prisma.WarehouseSelect;

export const warehouseListSelect = {
    id: true,
    name: true,
    status: true,
    created_at: true,
    market: {
        select: {
            name: true,
        },
    },
    manager: {
        select: {
            name: true,
            avatar: true,
        },
    },
} satisfies Prisma.WarehouseSelect;

export const warehouseDetailSelect = {
    ...warehouseSummarySelect,
    updated_at: true,
} satisfies Prisma.WarehouseSelect;

export const warehouseDetailWithStaffSelect = {
    ...warehouseDetailSelect,
    staff_scopes: {
        where: {
            scope_type: ScopeType.WAREHOUSE,
            staff: { is_active: true },
        },
        select: {
            staff: {
                select: {
                    id: true,
                    name: true,
                    avatar: true,
                },
            },
        },
        orderBy: {
            staff: { name: 'asc' as const },
        },
    },
} satisfies Prisma.WarehouseSelect;

export type WarehouseSummary = {
    id: string;
    name: string;
    market_id: string;
    manager_id: string;
    address: string;
    status: WarehouseStatus;
    created_at: Date;
};

export type WarehouseListItem = {
    id: string;
    name: string;
    status: WarehouseStatus;
    market_name: string;
    manager_name: string;
    manager_picture: string | null;
    created_at: Date;
};

export type WarehouseDetail = WarehouseSummary & {
    updated_at: Date;
};

export type WarehouseDetailResponse = WarehouseDetail & {
    staff: LocationStaffBrief[];
};

type WarehouseSummaryRow = Prisma.WarehouseGetPayload<{
    select: typeof warehouseSummarySelect;
}>;

type WarehouseListRow = Prisma.WarehouseGetPayload<{
    select: typeof warehouseListSelect;
}>;

type WarehouseDetailRow = Prisma.WarehouseGetPayload<{
    select: typeof warehouseDetailSelect;
}>;

type WarehouseDetailWithStaffRow = Prisma.WarehouseGetPayload<{
    select: typeof warehouseDetailWithStaffSelect;
}>;

export function toWarehouseSummary(
    row: WarehouseSummaryRow,
): WarehouseSummary {
    return {
        id: row.id,
        name: row.name,
        market_id: row.market_id,
        manager_id: row.manager_id,
        address: row.address,
        status: row.status,
        created_at: row.created_at,
    };
}

export function toWarehouseListItem(row: WarehouseListRow): WarehouseListItem {
    return {
        id: row.id,
        name: row.name,
        status: row.status,
        market_name: row.market.name,
        manager_name: row.manager.name,
        manager_picture: row.manager.avatar,
        created_at: row.created_at,
    };
}

export function toWarehouseDetail(row: WarehouseDetailRow): WarehouseDetail {
    return {
        ...toWarehouseSummary(row),
        updated_at: row.updated_at,
    };
}

export function toWarehouseDetailResponse(
    row: WarehouseDetailWithStaffRow,
): WarehouseDetailResponse {
    return {
        ...toWarehouseDetail(row),
        staff: row.staff_scopes.map(({ staff }) => ({
            id: staff.id,
            name: staff.name,
            picture: staff.avatar,
        })),
    };
}
