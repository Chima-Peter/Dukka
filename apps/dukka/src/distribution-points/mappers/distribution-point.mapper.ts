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
    ...distributionPointSummarySelect,
    market: { select: { id: true, name: true } },
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

export type DistributionPointListItem = DistributionPointSummary & {
    market: { id: string; name: string };
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
        ...toDistributionPointSummary(row),
        market: row.market,
    };
}
