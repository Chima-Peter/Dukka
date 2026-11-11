import type { AddressSummary } from '../../address/mappers/address.mapper.js';
import type { CartView } from '../../cart/types/cart.type.js';
import type { MarketPaymentMethodView } from '../../payments/mappers/payment.mapper.js';

export type PrecheckoutView = {
    shipping_addresses: AddressSummary[];
    billing_addresses: AddressSummary[];
    points_balance: number;
    payment_methods: MarketPaymentMethodView[];
    cash_limit: number;
    cart: CartView;
};
