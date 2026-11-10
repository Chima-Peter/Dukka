import type { LogisticsPartner, LogisticsPartnerType } from '@app/common';

export type LogisticsPartnerRecord = LogisticsPartner;

export type LogisticsPartnerSummary = {
    id: string;
    name: string;
    partner_type: LogisticsPartnerType;
    code: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
};

export type LogisticsPartnerDetail = LogisticsPartnerRecord & {
    shipment_legs_count: number;
};

export type LogisticsPartnerPage = {
    items: LogisticsPartnerSummary[];
    next_cursor: string | null;
};

export const logisticsPartnerSummarySelect = {
    id: true,
    name: true,
    partner_type: true,
    code: true,
    is_active: true,
    created_at: true,
    updated_at: true,
} as const;
