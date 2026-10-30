import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
    CouponStatus,
    OrderInventoryStatus,
    Prisma,
    PrismaService,
    PromotionMarketStatus,
} from '@app/common';
import {
    GENERAL_JOBS,
    GeneralQueueService,
    type InventoryStockReminderKind,
} from '@app/queues';

const EXPIRY_BATCH_SIZE = 20;

const quantityFilter = (
    kind: InventoryStockReminderKind,
): Prisma.IntFilter =>
    kind === 'finished'
        ? { equals: 0 }
        : { gt: 0, lte: 10 };

function chunkIds(ids: string[], size: number): string[][] {
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += size) {
        chunks.push(ids.slice(i, i + size));
    }
    return chunks;
}

@Injectable()
export class GeneralScheduler {
    private readonly logger = new Logger(GeneralScheduler.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly generalQueueService: GeneralQueueService,
    ) {}

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async expirePromotionsAndCoupons(): Promise<void> {
        await Promise.all([
            this.enqueuePromotionMarketsByEndDate(),
            this.enqueueExpiredCoupons(),
        ]);
    }

    private async enqueuePromotionMarketsByEndDate(): Promise<void> {
        this.logger.log('Scanning for promotion markets past end date');

        const markets = await this.prisma.promotionMarket.findMany({
            where: {
                end_date: { lte: new Date() },
                status: { not: PromotionMarketStatus.EXPIRED },
            },
            select: { id: true },
        });

        if (markets.length === 0) {
            this.logger.log('No promotion markets to expire by end date');
            return;
        }

        const batches = chunkIds(
            markets.map((market) => market.id),
            EXPIRY_BATCH_SIZE,
        );
        await this.generalQueueService.enqueueMany(
            batches.map((promotion_market_ids) => ({
                name: GENERAL_JOBS.EXPIRE_PROMOTION_MARKET,
                payload: { promotion_market_ids },
            })),
        );

        this.logger.log(
            `Enqueued ${batches.length} end-date expire-promotion-market batch job(s) for ${markets.length} market(s)`,
        );
    }

    private async enqueueExpiredCoupons(): Promise<void> {
        this.logger.log('Scanning for coupons to expire');

        const coupons = await this.prisma.coupon.findMany({
            where: {
                expires_at: { lte: new Date() },
                status: { not: CouponStatus.EXPIRED },
            },
            select: { id: true },
        });

        if (coupons.length === 0) {
            this.logger.log('No coupons to expire');
            return;
        }

        const batches = chunkIds(
            coupons.map((coupon) => coupon.id),
            EXPIRY_BATCH_SIZE,
        );
        await this.generalQueueService.enqueueMany(
            batches.map((coupon_ids) => ({
                name: GENERAL_JOBS.EXPIRE_COUPON,
                payload: { coupon_ids },
            })),
        );

        this.logger.log(
            `Enqueued ${batches.length} expire-coupon batch job(s) for ${coupons.length} coupon(s)`,
        );
    }

    @Cron('*/15 * * * *')
    async expiredReservations(): Promise<void> {
        this.logger.log('Scanning for expired inventory reservations');

        const reservations = await this.prisma.orderInventory.findMany({
            where: {
                expires_at: { lte: new Date() },
                status: OrderInventoryStatus.PENDING,
            },
            select: { id: true },
            take: 100,
            orderBy: { expires_at: 'asc' },
        });

        if (reservations.length === 0) {
            this.logger.log('No expired reservations to process');
            return;
        }

        await this.generalQueueService.enqueueMany(
            reservations.map((reservation) => ({
                name: GENERAL_JOBS.EXPIRED_RESERVATIONS,
                payload: { order_inventory_id: reservation.id },
            })),
        );

        this.logger.log(
            `Enqueued ${reservations.length} expired-reservations job(s)`,
        );
    }

    @Cron(CronExpression.EVERY_30_MINUTES)
    async finishedStockReminders(): Promise<void> {
        await this.enqueueStockReminders('finished', 50);
    }

    @Cron(CronExpression.EVERY_10_MINUTES)
    async lowStockReminders(): Promise<void> {
        await this.enqueueStockReminders('low', 10);
    }

    private async enqueueStockReminders(
        kind: InventoryStockReminderKind,
        maxAvailableQuantity: number,
    ): Promise<void> {
        this.logger.log(`Scanning for warehouses with pending ${kind} stock reminders`);

        const warehouses = await this.prisma.inventory.findMany({
            where: {
                available_quantity: quantityFilter(kind),
                ...(kind === 'finished'
                    ? {
                          finished_reminder_sent: false,
                          finished_reminder_sent_at: null,
                      }
                    : {
                          low_stock_reminder_sent: false,
                          low_stock_reminder_sent_at: null,
                      }),
            },
            select: { warehouse_id: true },
            distinct: ['warehouse_id'],
            take: maxAvailableQuantity,
            orderBy: { available_quantity: 'asc' },
        });

        if (warehouses.length === 0) {
            this.logger.log(`No pending ${kind} stock reminders`);
            return;
        }

        await this.generalQueueService.enqueueMany(
            warehouses.map((row) => ({
                name: GENERAL_JOBS.INVENTORY_STOCK_REMINDER,
                payload: {
                    warehouse_id: row.warehouse_id,
                    kind,
                },
            })),
        );

        this.logger.log(
            `Enqueued ${warehouses.length} ${kind} inventory-stock-reminder job(s)`,
        );
    }
}
