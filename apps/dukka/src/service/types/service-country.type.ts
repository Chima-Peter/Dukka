import type {
    ServiceCountry,
    ServiceCountryStatus,
    MarketStatus,
} from '@app/common';

export type ServiceCountryMarketSummary = {
    id: string;
    code: string;
    name: string;
    status: MarketStatus;
};

export type ServiceCountryWithMarket = ServiceCountry & {
    market: ServiceCountryMarketSummary | null;
};

export type ServiceCountryWithMarketStatus = {
    id: string;
    status: ServiceCountryStatus;
    market_id: string | null;
    market: { id: string; status: MarketStatus } | null;
};

export type ServiceCountryMarketMatch = {
    name: string;
    iso2: string;
    iso3: string;
    market_id: string | null;
};

export const serviceCountryWithMarket = {
    market: {
        select: {
            id: true,
            code: true,
            name: true,
            status: true,
        },
    },
} as const;
