import type {
    Country,
    CountryStatus,
    MarketStatus,
} from '../../../generated/prisma/client.js';

export type CountryMarketSummary = {
    id: string;
    code: string;
    name: string;
    status: MarketStatus;
};

export type CountryWithMarket = Country & {
    market: CountryMarketSummary | null;
};

export type CountryWithMarketStatus = {
    id: string;
    status: CountryStatus;
    market_id: string | null;
    market: { id: string; status: MarketStatus } | null;
};

export const countryWithMarket = {
    market: {
        select: {
            id: true,
            code: true,
            name: true,
            status: true,
        },
    },
} as const;
