import type { Warehouse } from '@app/common';

export type WarehouseRecord = Warehouse;

export type CreateWarehouseRecord = {
    market_id: string;
    name: string;
    manager_id: string;
    address: string;
};

export type WarehouseAuditActor = {
    id: string;
    name: string;
};

export type WarehouseWithAuditRelations = WarehouseRecord & {
    market: WarehouseAuditActor;
    manager: WarehouseAuditActor;
};

export type WarehouseStaffMember = {
    id: string;
    staff_id: string;
    warehouse_id: string;
    created_at: Date;
    staff: {
        id: string;
        name: string;
        email: string;
        is_active: boolean;
    };
};

export const warehouseStaffSelect = {
    id: true,
    staff_id: true,
    warehouse_id: true,
    created_at: true,
    staff: {
        select: {
            id: true,
            name: true,
            email: true,
            is_active: true,
        },
    },
} as const;
