import type { LogisticsPartner, LogisticsPartnerType, Prisma } from '@app/common';
import type {
    LogisticsPartnerDetail,
    LogisticsPartnerSummary,
} from '../types/logistics-partner.type.js';

export const logisticsPartnerSummarySelect = {
    id: true,
    name: true,
    partner_type: true,
    code: true,
    is_active: true,
    created_at: true,
    updated_at: true,
} satisfies Prisma.LogisticsPartnerSelect;

export const logisticsPartnerDetailSelect = {
    id: true,
    name: true,
    partner_type: true,
    contact_email: true,
    contact_phone: true,
    code: true,
    is_active: true,
    created_at: true,
    updated_at: true,
    _count: { select: { shipment_legs: true } },
} satisfies Prisma.LogisticsPartnerSelect;

export const logisticsPartnerRecordSelect = {
    id: true,
    name: true,
    partner_type: true,
    contact_email: true,
    contact_phone: true,
    code: true,
    is_active: true,
    created_at: true,
    updated_at: true,
} satisfies Prisma.LogisticsPartnerSelect;

type LogisticsPartnerDetailRow = Prisma.LogisticsPartnerGetPayload<{
    select: typeof logisticsPartnerDetailSelect;
}>;

export type LogisticsPartnerRecordView = {
    id: string;
    name: string;
    partner_type: LogisticsPartnerType;
    contact_email: string;
    contact_phone: string;
    code: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
};

export function toLogisticsPartnerSummary(
    row: LogisticsPartnerSummary,
): LogisticsPartnerSummary {
    return {
        id: row.id,
        name: row.name,
        partner_type: row.partner_type,
        code: row.code,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toLogisticsPartnerRecord(
    row: Pick<
        LogisticsPartner,
        | 'id'
        | 'name'
        | 'partner_type'
        | 'contact_email'
        | 'contact_phone'
        | 'code'
        | 'is_active'
        | 'created_at'
        | 'updated_at'
    >,
): LogisticsPartnerRecordView {
    return {
        id: row.id,
        name: row.name,
        partner_type: row.partner_type,
        contact_email: row.contact_email,
        contact_phone: row.contact_phone,
        code: row.code,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toLogisticsPartnerDetail(
    row: LogisticsPartnerDetailRow,
): LogisticsPartnerDetail {
    return {
        id: row.id,
        name: row.name,
        partner_type: row.partner_type,
        contact_email: row.contact_email,
        contact_phone: row.contact_phone,
        code: row.code,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        shipment_legs_count: row._count.shipment_legs,
    };
}
