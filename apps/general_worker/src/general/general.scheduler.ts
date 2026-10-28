import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
    OrderInventoryStatus,
    PrismaService,
    PromotionMarketStatus,
} from '@app/common';
import { GENERAL_JOBS, GeneralQueueService } from '@app/queues';

@Injectable()
export class GeneralScheduler {
    private readonly logger = new Logger(GeneralScheduler.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly generalQueueService: GeneralQueueService,
    ) {}

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async expirePromotions(): Promise<void> {
        this.logger.log('Scanning for promotion markets to expire');

        const markets = await this.prisma.promotionMarket.findMany({
            where: {
                end_date: { lte: new Date() },
                status: { not: PromotionMarketStatus.EXPIRED },
            },
            select: { id: true },
        });

        if (markets.length === 0) {
            this.logger.log('No promotion markets to expire');
            return;
        }

        await this.generalQueueService.enqueueMany(
            markets.map((market) => ({
                name: GENERAL_JOBS.EXPIRE_PROMOTION_MARKET,
                payload: { promotion_market_id: market.id },
            })),
        );

        this.logger.log(
            `Enqueued ${markets.length} expire-promotion-market job(s)`,
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

    @Cron(CronExpression.EVERY_HOUR)
    async stockReminders(): Promise<void> {
        this.logger.log('Scanning for warehouses with pending stock reminders');

        const warehouses = await this.prisma.inventory.findMany({
            where: {
                available_quantity: 0,
                reminder_sent: false,
                reminder_sent_at: null,
            },
            select: { warehouse_id: true },
            distinct: ['warehouse_id'],
        });

        if (warehouses.length === 0) {
            this.logger.log('No pending stock reminders');
            return;
        }

        await this.generalQueueService.enqueueMany(
            warehouses.map((row) => ({
                name: GENERAL_JOBS.INVENTORY_STOCK_REMINDER,
                payload: { warehouse_id: row.warehouse_id },
            })),
        );

        this.logger.log(
            `Enqueued ${warehouses.length} inventory-stock-reminder job(s)`,
        );
    }
}
