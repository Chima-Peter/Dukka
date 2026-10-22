import { ForbiddenException } from '@nestjs/common';

export function assertStaffHasMarkets(
    staffMarketIds: string[],
    marketIds: string[],
): void {
    const allowed = new Set(staffMarketIds);

    if (
        allowed.size === 0 ||
        marketIds.some((marketId) => !allowed.has(marketId))
    ) {
        throw new ForbiddenException(
            'Cannot operate on markets outside your assigned markets',
        );
    }
}
