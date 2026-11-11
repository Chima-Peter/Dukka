import type { WarehouseStatus } from '@app/common';
import type {
    WarehouseDetail,
    WarehouseSummary,
} from '../mappers/warehouse.mapper.js';

export type WarehouseRecord = WarehouseDetail;
export type WarehouseListRecord = WarehouseSummary;

export type CreateWarehouseRecord = {
    market_id: string;
    name: string;
    manager_id: string;
    address: string;
    country: string;
};

export type WarehouseAuditActor = {
    id: string;
    name: string;
};

export type WarehouseWithAuditRelations = {
    id: string;
    name: string;
    market_id: string;
    manager_id: string;
    status: WarehouseStatus;
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
