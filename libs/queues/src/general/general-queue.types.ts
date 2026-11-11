import type { GeneralJobName } from '../queue.constants.js';

export type EnqueueGeneralJobInput = {
    name: GeneralJobName;
    payload: unknown;
    jobId?: string;
};

export type ExpiredReservationsJobPayload = {
    order_inventory_id: string;
};

export type CancelOrderJobActor = {
    type: 'customer' | 'system';
    id?: string;
    name?: string;
    source: 'customer_cancel' | 'inventory_blocked' | 'account_deletion';
};

export type CancelOrderJobPayload = {
    order_id: string;
    actor?: CancelOrderJobActor;
};

export type OrderProcessingJobPayload = {
    order_id: string;
};

export type OrderShippedJobPayload = {
    order_id: string;
    tracking_number?: string;
};

export type OrderAwaitingPaymentJobPayload = {
    order_id: string;
};

export type CustomerRegisteredJobPayload = {
    customer_id: string;
    email: string;
    client_ip?: string;
};

export type InventoryStockReminderKind = 'finished' | 'low';

export type InventoryStockReminderJobPayload = {
    warehouse_id: string;
    kind: InventoryStockReminderKind;
};

export type CustomerAccountDeletedJobPayload = {
    customer_id: string;
    email: string;
    name: string;
};

export type StaffDeactivatedJobPayload = {
    staff_id: string;
    email: string;
    name: string;
    performed_by_staff_id: string;
    performed_by_staff_name: string;
    role_id: string | null;
    role_name: string | null;
};

export type MarketDeletedJobPayload = {
    market_id: string;
    name: string;
    code: string;
    performed_by_staff_id: string;
};

export type ExpirePromotionMarketJobPayload = {
    promotion_market_ids: string[];
};

export type ExpireCouponJobPayload = {
    coupon_ids: string[];
};

export type ExpireStaffInvitationJobPayload = {
    invitation_ids: string[];
};

export type ReviewReminderJobPayload = {
    order_id: string;
};

export type OrderCompletionJobPayload = {
    order_id: string;
};

