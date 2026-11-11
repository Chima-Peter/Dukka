import type { LogisticsPartnerType } from '@app/common';
import type { LogisticsPartnerRecordView } from '../mappers/logistics-partner.mapper.js';

export type LogisticsPartnerRecord = LogisticsPartnerRecordView;

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

export {
    logisticsPartnerSummarySelect,
    logisticsPartnerDetailSelect,
    logisticsPartnerRecordSelect,
} from '../mappers/logistics-partner.mapper.js';
