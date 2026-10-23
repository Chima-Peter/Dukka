import type {
    Country,
    CountryStatus,
} from '../../../generated/prisma/client.js';

export type CountryMarketSummary = {
    id: string;
    code: string;
    name: string;
    is_active: boolean;
};

export type CountryWithMarket = Country & {
    market: CountryMarketSummary | null;
};

export type CountryWithMarketStatus = {
    id: string;
    status: CountryStatus;
    market_id: string | null;
    market: { id: string; is_active: boolean } | null;
};

export const countryWithMarket = {
    market: {
        select: {
            id: true,
            code: true,
            name: true,
            is_active: true,
        },
    },
} as const;
