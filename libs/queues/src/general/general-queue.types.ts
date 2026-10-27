export type ExpiredReservationsJobPayload = {
    order_inventory_id: string;
};

export type CancelOrderJobPayload = {
    order_id: string;
};

export type CustomerRegisteredJobPayload = {
    customer_id: string;
    email: string;
    client_ip?: string;
};

export type InventoryStockReminderJobPayload = {
    warehouse_id: string;
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
