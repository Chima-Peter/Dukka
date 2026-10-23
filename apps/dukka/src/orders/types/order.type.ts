import type { OrderStatus, Prisma } from '../../../generated/prisma/client.js';
import type {
    customerOrderDetailSelect,
    staffOrderDetailSelect,
} from '../mappers/order.mapper.js';

export type TransitionOrderStatusInput = {
    order_id: string;
    from_statuses: OrderStatus[];
    to_status: OrderStatus;
    customer_id?: string;
    market_id?: string;
};

export type TransitionedOrder = {
    id: string;
    status: OrderStatus;
};

export type TransitionOrderStatusResult =
    | { ok: true; order: TransitionedOrder }
    | { ok: false; reason: 'not_found' }
    | { ok: false; reason: 'invalid_transition'; current_status: OrderStatus };

export type OrderSummary = {
    id: string;
    status: OrderStatus;
    order_number: string;
    amount: Prisma.Decimal;
    quantity: number;
    name: string | null;
    market_id: string;
    created_at: Date;
};

export type OrderSummaryPage = {
    items: OrderSummary[];
    next_cursor: string | null;
};

export type CustomerOrderDetail = Prisma.OrderGetPayload<{
    select: typeof customerOrderDetailSelect;
}>;

export type StaffOrderDetail = Prisma.OrderGetPayload<{
    select: typeof staffOrderDetailSelect;
}>;
