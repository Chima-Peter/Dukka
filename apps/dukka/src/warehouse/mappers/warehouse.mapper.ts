import type { Prisma, WarehouseStatus } from '@app/common';

export const warehouseSummarySelect = {
    id: true,
    name: true,
    market_id: true,
    manager_id: true,
    address: true,
    status: true,
    created_at: true,
    updated_at: true,
} satisfies Prisma.WarehouseSelect;

export const warehouseListSelect = {
    ...warehouseSummarySelect,
    market: { select: { id: true, name: true } },
    manager: { select: { id: true, name: true } },
} satisfies Prisma.WarehouseSelect;

export type WarehouseSummary = {
    id: string;
    name: string;
    market_id: string;
    manager_id: string;
    address: string;
    status: WarehouseStatus;
    created_at: Date;
    updated_at: Date;
};

export type WarehouseListItem = WarehouseSummary & {
    market: { id: string; name: string };
    manager: { id: string; name: string };
};

type WarehouseSummaryRow = Prisma.WarehouseGetPayload<{
    select: typeof warehouseSummarySelect;
}>;

type WarehouseListRow = Prisma.WarehouseGetPayload<{
    select: typeof warehouseListSelect;
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
        updated_at: row.updated_at,
    };
}

export function toWarehouseListItem(row: WarehouseListRow): WarehouseListItem {
    return {
        ...toWarehouseSummary(row),
        market: row.market,
        manager: row.manager,
    };
}
