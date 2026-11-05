import { Injectable, Logger } from '@nestjs/common';
import {
    MarketStatus,
    NotificationPublisher,
    NotificationType,
    PrismaService,
} from '@app/common';
import {
    MAIL_TEMPLATES,
    MailQueueService,
    type MarketDeletedJobPayload,
} from '@app/queues';

@Injectable()
export class MarketDeletedService {
    private readonly logger = new Logger(MarketDeletedService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mailQueueService: MailQueueService,
        private readonly notificationPublisher: NotificationPublisher,
    ) {}

    async process(payload: MarketDeletedJobPayload): Promise<void> {
        const { market_id } = payload;

        this.logger.log(`Deleting market ${market_id}`);

        const market = await this.prisma.market.findUnique({
            where: { id: market_id },
            select: { id: true, name: true, code: true, status: true },
        });

        if (!market) {
            this.logger.log(
                `Skipped market deletion for ${market_id} (market not found)`,
            );
            return;
        }

        if (market.status !== MarketStatus.CLOSED) {
            this.logger.warn(
                `Skipped market deletion for ${market_id} (status=${market.status})`,
            );
            return;
        }

        const [stateCount, warehouseCount] = await Promise.all([
            this.prisma.serviceState.count({ where: { market_id } }),
            this.prisma.warehouse.count({ where: { market_id } }),
        ]);

        const name = payload.name || market.name;
        const code = payload.code || market.code;

        if (stateCount > 0 || warehouseCount > 0) {
            this.logger.warn(
                `Skipped market deletion for ${market_id} (service_states=${stateCount}, warehouses=${warehouseCount})`,
            );
            const blockers: string[] = [];
            if (stateCount > 0) {
                blockers.push(
                    `${stateCount} service state${stateCount === 1 ? '' : 's'}`,
                );
            }
            if (warehouseCount > 0) {
                blockers.push(
                    `${warehouseCount} warehouse${warehouseCount === 1 ? '' : 's'}`,
                );
            }
            await this.notificationPublisher.notifyStaff(
                payload.performed_by_staff_id,
                {
                    title: 'Market deletion failed',
                    type: NotificationType.MARKET,
                    text: `${name} (${code}) could not be deleted while it still has ${blockers.join(' and ')}.`,
                },
            );
            return;
        }

        const contacts = await this.prisma.staff.findMany({
            where: {
                is_active: true,
                staff_scopes: {
                    some: { market_id },
                },
            },
            select: {
                id: true,
                email: true,
                name: true,
            },
        });

        await this.prisma.market.delete({ where: { id: market_id } });
        this.logger.log(`Market deleted ${market_id}`);

        await this.mailQueueService.enqueueSendMany(
            contacts.map((contact) => ({
                to: contact.email,
                subject: 'A market you access was deleted',
                template: MAIL_TEMPLATES.MARKET_DELETED,
                context: {
                    name: contact.name,
                    email: contact.email,
                    marketId: market_id,
                    marketName: name,
                    marketCode: code,
                },
            })),
        );

        await Promise.all(
            contacts.map((contact) =>
                this.notificationPublisher.notifyStaff(contact.id, {
                    title: 'Market deleted',
                    type: NotificationType.MARKET,
                    text: `${name} (${code}) was deleted.`,
                }),
            ),
        );
    }
}
