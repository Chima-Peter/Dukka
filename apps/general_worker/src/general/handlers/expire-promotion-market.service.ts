import { Injectable, Logger } from '@nestjs/common';
import {
    PrismaService,
    PromotionMarketStatus,
    PromotionStatus,
} from '@app/common';
import type { ExpirePromotionMarketJobPayload } from '@app/queues';

type LockedPromotionMarket = {
    id: string;
    promotion_id: string;
    status: PromotionMarketStatus;
};

@Injectable()
export class ExpirePromotionMarketService {
    private readonly logger = new Logger(ExpirePromotionMarketService.name);

    constructor(private readonly prisma: PrismaService) {}

    async process(payload: ExpirePromotionMarketJobPayload): Promise<void> {
        const result = await this.prisma.$transaction(async (tx) => {
            const locked = await tx.$queryRaw<LockedPromotionMarket[]>`
                SELECT pm.id, pm.promotion_id, pm.status
                FROM "PromotionMarket" pm
                JOIN "Promotion" p ON p.id = pm.promotion_id
                WHERE pm.id = ${payload.promotion_market_id}::uuid
                  AND pm.end_date <= NOW()
                  AND pm.status <> ${PromotionMarketStatus.EXPIRED}::"PromotionMarketStatus"
                FOR UPDATE OF pm, p
            `;

            if (locked.length === 0) {
                return null;
            }

            const promotionMarket = locked[0];

            await tx.promotionMarket.update({
                where: { id: promotionMarket.id },
                data: { status: PromotionMarketStatus.EXPIRED },
            });

            const expiredPromotion = await tx.promotion.updateMany({
                where: {
                    id: promotionMarket.promotion_id,
                    status: { not: PromotionStatus.EXPIRED },
                    promotion_markets: {
                        every: { status: PromotionMarketStatus.EXPIRED },
                    },
                },
                data: { status: PromotionStatus.EXPIRED },
            });

            return {
                promotion_market_id: promotionMarket.id,
                promotion_id: promotionMarket.promotion_id,
                promotion_expired: expiredPromotion.count > 0,
            };
        });

        if (!result) {
            this.logger.log(
                `Skipped expire-promotion-market for ${payload.promotion_market_id} (not eligible)`,
            );
            return;
        }

        this.logger.log(
            `Expired promotion market ${result.promotion_market_id}` +
                (result.promotion_expired
                    ? `; promotion ${result.promotion_id} expired`
                    : ''),
        );
    }
}
