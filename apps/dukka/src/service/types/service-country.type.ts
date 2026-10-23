import type {
    ServiceCountry,
    ServiceCountryStatus,
    MarketStatus,
} from '../../../generated/prisma/client.js';

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
