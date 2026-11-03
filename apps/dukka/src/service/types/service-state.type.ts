import type { ServiceStateStatus } from '@app/common';

export type ServiceStateItem = {
    id: string;
    market_id: string;
    state_name: string;
    status: ServiceStateStatus;
    warehouse_ids: string[];
    created_at: Date;
    updated_at: Date;
};

export type WarehouseServiceStateItem = {
    id: string;
    warehouse_id: string;
    service_state_id: string;
    created_at: Date;
    updated_at: Date;
};
