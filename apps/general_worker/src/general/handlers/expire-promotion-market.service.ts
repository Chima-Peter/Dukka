import { Injectable, Logger } from '@nestjs/common';
import {
    Prisma,
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
        const ids = payload.promotion_market_ids;
        if (ids.length === 0) {
            this.logger.log('Skipped expire-promotion-market (empty batch)');
            return;
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const locked = await tx.$queryRaw<LockedPromotionMarket[]>`
                SELECT pm.id, pm.promotion_id, pm.status
                FROM "PromotionMarket" pm
                JOIN "Promotion" p ON p.id = pm.promotion_id
                WHERE pm.id IN (${Prisma.join(ids)})
                  AND pm.status <> ${PromotionMarketStatus.EXPIRED}::"PromotionMarketStatus"
                  AND (
                    pm.end_date <= NOW()
                    OR (
                      pm.max_total_uses > 0
                      AND (
                        SELECT COUNT(*)::int
                        FROM "PromotionUsage" pu
                        WHERE pu.promotion_market_id = pm.id
                      ) >= pm.max_total_uses
                    )
                  )
                FOR UPDATE OF pm, p
            `;

            if (locked.length === 0) {
                return null;
            }

            const marketIds = locked.map((market) => market.id);
            const promotionIds = [...new Set(locked.map((m) => m.promotion_id))];

            await tx.promotionMarket.updateMany({
                where: { id: { in: marketIds } },
                data: { status: PromotionMarketStatus.EXPIRED },
            });

            const expiredPromotions = await tx.promotion.updateMany({
                where: {
                    id: { in: promotionIds },
                    status: { not: PromotionStatus.EXPIRED },
                    promotion_markets: {
                        every: { status: PromotionMarketStatus.EXPIRED },
                    },
                },
                data: { status: PromotionStatus.EXPIRED },
            });

            return {
                market_count: marketIds.length,
                promotion_count: expiredPromotions.count,
            };
        });

        if (!result) {
            this.logger.log(
                `Skipped expire-promotion-market batch of ${ids.length} (none eligible)`,
            );
            return;
        }

        this.logger.log(
            `Expired ${result.market_count} promotion market(s)` +
                (result.promotion_count > 0
                    ? `; expired ${result.promotion_count} promotion(s)`
                    : ''),
        );
    }
}
