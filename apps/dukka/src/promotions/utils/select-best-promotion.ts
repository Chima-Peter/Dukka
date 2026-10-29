import { DiscountType, Prisma } from '@app/common';
import { computeDiscountAmount } from './compute-discount-amount.js';

export type PromoCandidate = {
    promotion_market_id: string;
    max_uses_per_customer: number;
    customer_usage_count: number;
    discount: {
        type: DiscountType;
        value: Prisma.Decimal | number | string;
        max_discount_amount: Prisma.Decimal | number | string;
    };
};

export function isPromotionAvailableForCustomer(
    promo: Pick<PromoCandidate, 'max_uses_per_customer' | 'customer_usage_count'>,
): boolean {
    return (
        promo.max_uses_per_customer === 0 ||
        promo.customer_usage_count < promo.max_uses_per_customer
    );
}

export function selectBestPromotion<T extends PromoCandidate>(
    promos: T[],
    price: Prisma.Decimal | number | string,
): (T & { amount: Prisma.Decimal }) | null {
    const priceDecimal = new Prisma.Decimal(price);
    if (priceDecimal.lte(0)) {
        return null;
    }

    let best: (T & { amount: Prisma.Decimal }) | null = null;

    for (const promo of promos) {
        if (!isPromotionAvailableForCustomer(promo)) {
            continue;
        }

        const amount = computeDiscountAmount(
            promo.discount.type,
            promo.discount.value,
            promo.discount.max_discount_amount,
            priceDecimal,
        );

        if (best === null || amount.gt(best.amount)) {
            best = { ...promo, amount };
        }
    }

    return best;
}
