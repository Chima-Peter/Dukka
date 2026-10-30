import { DiscountType, Prisma } from '@app/common';

export function computeDiscountAmount(
    type: DiscountType,
    value: Prisma.Decimal | number | string,
    maxDiscountAmount: Prisma.Decimal | number | string,
    price: Prisma.Decimal | number | string,
): Prisma.Decimal {
    const priceDecimal = new Prisma.Decimal(price);
    if (priceDecimal.lte(0)) {
        return new Prisma.Decimal(0);
    }

    const valueDecimal = new Prisma.Decimal(value);
    const maxDecimal = new Prisma.Decimal(maxDiscountAmount);

    const raw =
        type === DiscountType.PERCENTAGE
            ? priceDecimal.mul(valueDecimal).div(100)
            : valueDecimal;

    return Prisma.Decimal.min(
        Prisma.Decimal.min(raw, maxDecimal),
        priceDecimal,
    );
}
