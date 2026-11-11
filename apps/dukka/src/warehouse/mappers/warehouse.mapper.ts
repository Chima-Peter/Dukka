import type { Prisma, WarehouseStatus } from '@app/common';

export const warehouseSummarySelect = {
    id: true,
    name: true,
    market_id: true,
    manager_id: true,
    address: true,
    status: true,
    created_at: true,
} satisfies Prisma.WarehouseSelect;

export const warehouseDetailSelect = {
    ...warehouseSummarySelect,
    updated_at: true,
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

export type WarehouseDetail = WarehouseSummary & {
    updated_at: Date;
};

type WarehouseSummaryRow = Prisma.WarehouseGetPayload<{
    select: typeof warehouseSummarySelect;
}>;

type WarehouseDetailRow = Prisma.WarehouseGetPayload<{
    select: typeof warehouseDetailSelect;
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

export function toWarehouseDetail(row: WarehouseDetailRow): WarehouseDetail {
    return {
        ...toWarehouseSummary(row),
        updated_at: row.updated_at,
    };
}
