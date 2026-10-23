import { BadRequestException } from '@nestjs/common';
import type { CustomerService } from '../customer/customer.service.js';

export async function resolveMarketId(
    customerService: CustomerService,
    customerId: string | undefined,
    marketId: string | undefined,
): Promise<string> {
    if (customerId) {
        const activeMarketId =
            await customerService.getActiveMarketId(customerId);
        if (!activeMarketId) {
            throw new BadRequestException('Active market is not set');
        }
        return activeMarketId;
    }

    if (!marketId) {
        throw new BadRequestException('market_id is required');
    }

    return marketId;
}
