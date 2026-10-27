export type ExpiredReservationsJobPayload = {
    order_inventory_id: string;
};

export type CancelOrderJobPayload = {
    order_id: string;
};

export type OrderMatchingJobPayload = {
    customer_id: string;
    email: string;
};

export type InventoryStockReminderJobPayload = {
    warehouse_id: string;
};

export type CustomerAccountDeletedJobPayload = {
    customer_id: string;
    email: string;
    name: string;
};
