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
