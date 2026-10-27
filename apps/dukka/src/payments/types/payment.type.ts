import type { Prisma } from '@app/common';
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
};

export type UpdatePaymentIntentInput = {
    payment_intent_id: string;
    payment_intent_url?: string;
};
