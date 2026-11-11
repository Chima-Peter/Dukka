import type { Prisma } from '@app/common';
import { ScopeType } from '@app/common';
import type { LocationStaffBrief } from '../../staff/types/staff.types.js';

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

export const distributionPointDetailWithStaffSelect = {
    ...distributionPointSummarySelect,
    staff_scopes: {
        where: {
            scope_type: ScopeType.DISTRIBUTION_POINT,
            staff: { is_active: true },
        },
        select: {
            staff: {
                select: {
                    id: true,
                    name: true,
                    avatar: true,
                },
            },
        },
        orderBy: {
            staff: { name: 'asc' as const },
        },
    },
} satisfies Prisma.DistributionPointSelect;

export const distributionPointListSelect = {
    id: true,
    name: true,
    city: true,
    is_active: true,
    created_at: true,
    market: {
        select: {
            name: true,
        },
    },
    state: {
        select: {
            state_name: true,
        },
    },
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

export type DistributionPointDetailResponse = DistributionPointSummary & {
    staff: LocationStaffBrief[];
};

export type DistributionPointListItem = {
    id: string;
    name: string;
    city: string;
    is_active: boolean;
    market_name: string;
    state_name: string;
    created_at: Date;
};

type DistributionPointSummaryRow = Prisma.DistributionPointGetPayload<{
    select: typeof distributionPointSummarySelect;
}>;

type DistributionPointDetailWithStaffRow = Prisma.DistributionPointGetPayload<{
    select: typeof distributionPointDetailWithStaffSelect;
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

export function toDistributionPointDetailResponse(
    row: DistributionPointDetailWithStaffRow,
): DistributionPointDetailResponse {
    return {
        ...toDistributionPointSummary(row),
        staff: row.staff_scopes.map(({ staff }) => ({
            id: staff.id,
            name: staff.name,
            picture: staff.avatar,
        })),
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
        market_name: row.market.name,
        state_name: row.state.state_name,
        created_at: row.created_at,
    };
}
