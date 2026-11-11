import type { Market, MarketStatus } from '@app/common';

export type MarketCurrencySummary = {
    id: string;
    code: string;
    name: string;
};

export type MarketNamedRef = {
    id: string;
    name: string;
};

export type MarketWithCurrency = Market & {
    currency: MarketCurrencySummary;
    warehouses: MarketNamedRef[];
    distribution_points: MarketNamedRef[];
};

export type MarketSearchMatch = {
    id: string;
    name: string;
    code: string;
    iso2: string;
    iso3: string;
    status: MarketStatus;
    currency: MarketCurrencySummary;
};

const namedRefSelect = {
    id: true,
    name: true,
} as const;

export const marketWithCurrency = {
    currency: {
        select: {
            id: true,
            code: true,
            name: true,
        },
    },
    warehouses: {
        select: namedRefSelect,
        orderBy: { name: 'asc' as const },
    },
    distribution_points: {
        select: namedRefSelect,
        orderBy: { name: 'asc' as const },
    },
} as const;
