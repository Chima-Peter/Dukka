export type ExpiredReservationsJobPayload = {
    order_inventory_id: string;
};

export type OrderMatchingJobPayload = {
    customer_id: string;
    email: string;
};
