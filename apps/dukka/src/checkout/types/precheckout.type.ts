import type { BillingAddress, ShippingAddress } from '@app/common';
import type { CartView } from '../../cart/types/cart.type.js';
import type { MarketPaymentMethodView } from '../../payments/mappers/payment.mapper.js';

export type PrecheckoutView = {
    shipping_addresses: ShippingAddress[];
    billing_addresses: BillingAddress[];
    points_balance: number;
    payment_methods: MarketPaymentMethodView[];
    cash_limit: number;
    cart: CartView;
};
