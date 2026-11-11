import type { MarketStatus, Prisma } from '@app/common';
import type {
    MarketCurrencySummary,
    MarketWithCurrency,
} from '../types/market.type.js';

export const marketSummarySelect = {
    id: true,
    name: true,
    code: true,
    status: true,
    iso2: true,
    created_at: true,
    currency: {
        select: {
            code: true,
        },
    },
} satisfies Prisma.MarketSelect;

export type MarketSummaryRow = Prisma.MarketGetPayload<{
    select: typeof marketSummarySelect;
}>;

export type MarketSummary = {
    id: string;
    name: string;
    code: string;
    status: MarketStatus;
    iso2: string;
    currency_code: string;
    created_at: Date;
};

export type MarketResponse = {
    id: string;
    name: string;
    code: string;
    iso2: string;
    iso3: string;
    cash_limit: number;
    status: MarketStatus;
    created_at: Date;
    updated_at: Date;
    currency: MarketCurrencySummary;
};

export function toMarketSummary(row: MarketSummaryRow): MarketSummary {
    return {
        id: row.id,
        name: row.name,
        code: row.code,
        status: row.status,
        iso2: row.iso2,
        currency_code: row.currency.code,
        created_at: row.created_at,
    };
}

export function toMarketResponse(row: MarketWithCurrency): MarketResponse {
    return {
        id: row.id,
        name: row.name,
        code: row.code,
        iso2: row.iso2,
        iso3: row.iso3,
        cash_limit: row.cash_limit.toNumber(),
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        currency: row.currency,
    };
}
