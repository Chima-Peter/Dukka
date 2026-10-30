import type { BillingAddress, ShippingAddress } from '@app/common';
import type { CartView } from '../../cart/types/cart.type.js';
import type { MarketPaymentMethodDetail } from '../../payments/types/payment.type.js';

export type PrecheckoutView = {
    shipping_addresses: ShippingAddress[];
    billing_addresses: BillingAddress[];
    points_balance: number;
    payment_methods: MarketPaymentMethodDetail[];
    cart: CartView;
};
