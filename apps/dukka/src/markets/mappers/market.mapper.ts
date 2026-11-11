import type { MarketStatus } from '@app/common';
import type {
    MarketCurrencySummary,
    MarketWithCurrency,
} from '../types/market.type.js';

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
