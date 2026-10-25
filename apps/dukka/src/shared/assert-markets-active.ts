import { BadRequestException } from '@nestjs/common';
import { MarketStatus } from '@app/common';

export function assertMarketsActive(
    markets: { id: string; status: MarketStatus }[],
): void {
    const inactive_ids = markets
        .filter((market) => market.status !== MarketStatus.OPEN)
        .map((market) => market.id);
    if (inactive_ids.length === 0) {
        return;
    }
    throw new BadRequestException({
        message: `Inactive market id(s): ${inactive_ids.join(', ')}`,
        inactive_ids,
    });
}
