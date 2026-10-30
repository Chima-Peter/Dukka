import type { BillingAddress, ShippingAddress } from '@app/common';
import type { CartView } from '../../cart/types/cart.type.js';

export type PrecheckoutView = {
    shipping_addresses: ShippingAddress[];
    billing_addresses: BillingAddress[];
    points_balance: number;
    cart: CartView;
};
