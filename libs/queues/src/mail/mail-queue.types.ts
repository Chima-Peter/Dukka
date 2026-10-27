export interface SendMailJobPayload {
    to: string;
    subject: string;
    template?: string;
    html?: string;
    context?: Record<string, unknown>;
}

export type InventoryStockReminderMailPayload = {
    to: string;
    manager_name: string;
    warehouse_id: string;
    warehouse_name: string;
    inventory_ids: string[];
    product_names: string[];
};
