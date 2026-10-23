import type { OrderStatus, Prisma } from '../../../generated/prisma/client.js';

export type OrderSummary = {
    id: string;
    status: OrderStatus;
    order_number: string;
    amount: Prisma.Decimal;
    quantity: number;
    name: string | null;
    created_at: Date;
};

export type OrderSummaryPage = {
    items: OrderSummary[];
    next_cursor: string | null;
};
