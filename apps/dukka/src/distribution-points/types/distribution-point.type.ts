import type { DistributionPoint } from '@app/common';

export type DistributionPointRecord = DistributionPoint;

export type CreateDistributionPointRecord = {
    market_id: string;
    state_id: string;
    name: string;
    address: string;
    city: string;
    zip: string;
    contact_phone: string;
    state: string;
    country: string;
};

export type DistributionPointAuditActor = {
    id: string;
    name: string;
};

export type DistributionPointWithAuditRelations = DistributionPointRecord & {
    market: DistributionPointAuditActor;
};

export type DistributionPointStaffMember = {
    id: string;
    staff_id: string;
    distribution_point_id: string;
    created_at: Date;
    staff: {
        id: string;
        name: string;
        email: string;
        is_active: boolean;
    };
};

export const distributionPointStaffSelect = {
    id: true,
    staff_id: true,
    distribution_point_id: true,
    created_at: true,
    staff: {
        select: {
            id: true,
            name: true,
            email: true,
            is_active: true,
        },
    },
} as const;
