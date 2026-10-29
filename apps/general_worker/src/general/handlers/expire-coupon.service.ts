import { Injectable, Logger } from '@nestjs/common';
import { CouponStatus, Prisma, PrismaService } from '@app/common';
import type { ExpireCouponJobPayload } from '@app/queues';

type LockedCoupon = {
    id: string;
    status: CouponStatus;
};

@Injectable()
export class ExpireCouponService {
    private readonly logger = new Logger(ExpireCouponService.name);

    constructor(private readonly prisma: PrismaService) {}

    async process(payload: ExpireCouponJobPayload): Promise<void> {
        const ids = payload.coupon_ids;
        if (ids.length === 0) {
            this.logger.log('Skipped expire-coupon (empty batch)');
            return;
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const locked = await tx.$queryRaw<LockedCoupon[]>`
                SELECT c.id, c.status
                FROM "Coupon" c
                WHERE c.id IN (${Prisma.join(ids)})
                  AND c.status <> ${CouponStatus.EXPIRED}::"CouponStatus"
                  AND c.expires_at <= NOW()
                FOR UPDATE OF c
            `;

            if (locked.length === 0) {
                return null;
            }

            const couponIds = locked.map((coupon) => coupon.id);

            await tx.coupon.updateMany({
                where: { id: { in: couponIds } },
                data: { status: CouponStatus.EXPIRED },
            });

            return { coupon_count: couponIds.length };
        });

        if (!result) {
            this.logger.log(
                `Skipped expire-coupon batch of ${ids.length} (none eligible)`,
            );
            return;
        }

        this.logger.log(`Expired ${result.coupon_count} coupon(s)`);
    }
}
