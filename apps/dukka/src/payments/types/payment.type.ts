import type { OrderPaymentAttemptStatus, Prisma } from '@app/common';
import type {
    marketPaymentMethodSelect,
    paymentAttemptDetailSelect,
    paymentAttemptSummarySelect,
    paymentMethodDetailSelect,
} from '../mappers/payment.mapper.js';

export type MarketPaymentMethodDetail = Prisma.MarketPaymentMethodGetPayload<{
    select: typeof marketPaymentMethodSelect;
}>;

export type PaymentMethodDetail = Prisma.PaymentMethodGetPayload<{
    select: typeof paymentMethodDetailSelect;
}>;

export type PaymentAttemptSummary = Prisma.OrderPaymentAttemptGetPayload<{
    select: typeof paymentAttemptSummarySelect;
}>;

export type PaymentAttemptDetail = Prisma.OrderPaymentAttemptGetPayload<{
    select: typeof paymentAttemptDetailSelect;
}>;

export type PaymentAttemptPage = {
    items: PaymentAttemptSummary[];
    next_cursor: string | null;
};

export type CreatePaymentAttemptInput = {
    order_id: string;
    market_payment_method_id: string;
    payment_method_name: string;
    status?: OrderPaymentAttemptStatus;
    payment_intent_id?: string;
    payment_intent_url?: string;
};

export type UpdatePaymentIntentInput = {
    payment_intent_id: string;
    payment_intent_url?: string;
};

export type ConvertCashAttemptToPaystackInput = {
    payment_intent_id: string;
    payment_intent_url: string;
};

export type StaffPaystackPayResult = {
    order_id: string;
    payment_attempt_id: string;
    authorization_url: string;
    reference: string;
    status: OrderPaymentAttemptStatus;
};

export type PaymentErrorMessages = {
    conflict?: string;
    notFound?: string;
};
