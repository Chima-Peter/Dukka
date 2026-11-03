import type { Warehouse } from '@app/common';

export type WarehouseRecord = Warehouse;

export type CreateWarehouseRecord = {
    market_id: string;
    name: string;
    manager_id: string;
    address: string;
};
