import type { Prisma } from '@app/common';

export const distributionPointSummarySelect = {
    id: true,
    name: true,
    city: true,
    contact_phone: true,
    is_active: true,
    market_id: true,
    state: {
        select: {
            state_name: true,
        },
    },
    created_at: true,
    updated_at: true,
} satisfies Prisma.DistributionPointSelect;

export const distributionPointListSelect = {
    id: true,
    name: true,
    city: true,
    is_active: true,
    market_id: true,
    state_id: true,
    created_at: true,
} satisfies Prisma.DistributionPointSelect;

export type DistributionPointSummary = {
    id: string;
    name: string;
    city: string;
    contact_phone: string;
    is_active: boolean;
    market_id: string;
    state: string;
    created_at: Date;
    updated_at: Date;
};

export type DistributionPointListItem = {
    id: string;
    name: string;
    city: string;
    is_active: boolean;
    market_id: string;
    state_id: string;
    created_at: Date;
};

type DistributionPointSummaryRow = Prisma.DistributionPointGetPayload<{
    select: typeof distributionPointSummarySelect;
}>;

type DistributionPointListRow = Prisma.DistributionPointGetPayload<{
    select: typeof distributionPointListSelect;
}>;

export function toDistributionPointSummary(
    row: DistributionPointSummaryRow,
): DistributionPointSummary {
    return {
        id: row.id,
        name: row.name,
        city: row.city,
        contact_phone: row.contact_phone,
        is_active: row.is_active,
        market_id: row.market_id,
        state: row.state.state_name,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toDistributionPointListItem(
    row: DistributionPointListRow,
): DistributionPointListItem {
    return {
        id: row.id,
        name: row.name,
        city: row.city,
        is_active: row.is_active,
        market_id: row.market_id,
        state_id: row.state_id,
        created_at: row.created_at,
    };
}
