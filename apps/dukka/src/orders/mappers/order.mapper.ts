import type { Prisma } from '../../../generated/prisma/client.js';
import type { OrderSummary } from '../types/order.type.js';

export const orderSummarySelect = {
    id: true,
    status: true,
    order_number: true,
    total_amount: true,
    guest_name: true,
    created_at: true,
    customer: {
        select: {
            name: true,
        },
    },
    order_tems: {
        select: {
            quantity: true,
        },
    },
} satisfies Prisma.OrderSelect;

type OrderSummaryRow = Prisma.OrderGetPayload<{
    select: typeof orderSummarySelect;
}>;

export function toOrderSummary(row: OrderSummaryRow): OrderSummary {
    return {
        id: row.id,
        status: row.status,
        order_number: row.order_number,
        amount: row.total_amount,
        quantity: row.order_tems.reduce((sum, item) => sum + item.quantity, 0),
        name: row.customer?.name ?? row.guest_name,
        created_at: row.created_at,
    };
}
