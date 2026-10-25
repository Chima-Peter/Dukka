import type { Warehouse } from '@app/common';

export type WarehouseCountrySummary = {
    id: string;
    market_id: string | null;
};

export type WarehouseRecord = Warehouse & {
    country: WarehouseCountrySummary;
};

export type CreateWarehouseRecord = {
    country_id: string;
    name: string;
    manager_id: string;
    address: string;
};

export const warehouseWithCountry = {
    country: {
        select: {
            id: true,
            market_id: true,
        },
    },
} as const;
