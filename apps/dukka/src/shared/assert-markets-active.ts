import { BadRequestException } from '@nestjs/common';

export function assertMarketsActive(
    markets: { id: string; is_active: boolean }[],
): void {
    const inactive_ids = markets
        .filter((market) => !market.is_active)
        .map((market) => market.id);
    if (inactive_ids.length === 0) {
        return;
    }
    throw new BadRequestException({
        message: `Inactive market id(s): ${inactive_ids.join(', ')}`,
        inactive_ids,
    });
}
