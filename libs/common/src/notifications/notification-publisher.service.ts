import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import type { Notification, NotificationType } from '../../generated/prisma/client.js';

export type PublishNotificationInput = {
    title: string;
    type: NotificationType;
    text: string;
};

@Injectable()
export class NotificationPublisher {
    private readonly logger = new Logger(NotificationPublisher.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService,
    ) {}

    async notifyCustomer(
        customerId: string,
        input: PublishNotificationInput,
    ): Promise<Notification | null> {
        return this.createAndPublish({
            ...input,
            customer_id: customerId,
        });
    }

    async notifyStaff(
        staffId: string,
        input: PublishNotificationInput,
    ): Promise<Notification | null> {
        return this.createAndPublish({
            ...input,
            staff_id: staffId,
        });
    }

    private async createAndPublish(data: {
        title: string;
        type: NotificationType;
        text: string;
        customer_id?: string;
        staff_id?: string;
    }): Promise<Notification | null> {
        const recipientId = data.customer_id ?? data.staff_id;
        if (!recipientId) {
            this.logger.warn(
                'Notification skipped: missing customer_id or staff_id',
            );
            return null;
        }

        try {
            const created = await this.prisma.notification.create({ data });
            const payload = {
                id: created.id,
                title: created.title,
                type: created.type,
                text: created.text,
                has_read: created.has_read,
                created_at: created.created_at,
                read_at: created.read_at,
            };
            const streamId = await this.redisService.addToStream(
                recipientId,
                created.type,
                payload,
            );

            return await this.prisma.notification.update({
                where: { id: created.id },
                data: { stream_id: streamId },
            });
        } catch (error) {
            this.logger.error(
                `Failed to publish notification for ${recipientId}: ${error}`,
            );
            return null;
        }
    }
}
