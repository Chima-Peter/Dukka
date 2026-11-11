export const addressSummarySelect = {
    id: true,
    first_name: true,
    last_name: true,
    phone_number: true,
    street_address: true,
    state: true,
    country: true,
} as const;

export type AddressSummary = {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    street_address: string;
    state: string;
    country: string;
};

type AddressSummaryRow = {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    street_address: string;
    state: string;
    country: string;
};

export function toAddressSummary(row: AddressSummaryRow): AddressSummary {
    return {
        id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        phone_number: row.phone_number,
        street_address: row.street_address,
        state: row.state,
        country: row.country,
    };
}
