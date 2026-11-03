import type { Market, MarketStatus } from '@app/common';

export type MarketCurrencySummary = {
    id: string;
    code: string;
    name: string;
};

export type MarketWithCurrency = Market & {
    currency: MarketCurrencySummary;
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

export const marketWithCurrency = {
    currency: {
        select: {
            id: true,
            code: true,
            name: true,
        },
    },
} as const;
