import { Injectable } from '@nestjs/common';
import {
    PrismaService,
    type Notification,
    type Prisma,
} from '@app/common';
import type { FindNotificationsDto } from './dto/find-notifications.dto.js';

export type NotificationsPage = {
    items: Notification[];
    next_cursor: string | null;
};

@Injectable()
export class NotificationsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findForCustomer(
        customer_id: string,
        query: FindNotificationsDto,
    ): Promise<NotificationsPage> {
        return this.findPage({ customer_id }, query);
    }

    async findForStaff(
        staff_id: string,
        query: FindNotificationsDto,
    ): Promise<NotificationsPage> {
        return this.findPage({ staff_id }, query);
    }

    async markReadForCustomer(
        customer_id: string,
        ids: string[],
    ): Promise<{ count: number }> {
        return this.markRead({ customer_id }, ids);
    }

    async markReadForStaff(
        staff_id: string,
        ids: string[],
    ): Promise<{ count: number }> {
        return this.markRead({ staff_id }, ids);
    }

    private async findPage(
        recipient: Prisma.NotificationWhereInput,
        query: FindNotificationsDto,
    ): Promise<NotificationsPage> {
        const limit = query.limit ?? 20;

        const records = await this.prisma.notification.findMany({
            where: {
                ...recipient,
                ...(query.type !== undefined && { type: query.type }),
                ...(query.has_read !== undefined && {
                    has_read: query.has_read,
                }),
            },
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
        });

        const hasMore = records.length > limit;
        const items = hasMore ? records.slice(0, limit) : records;

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1].id : null,
        };
    }

    private async markRead(
        recipient: Prisma.NotificationWhereInput,
        ids: string[],
    ): Promise<{ count: number }> {
        const result = await this.prisma.notification.updateMany({
            where: {
                ...recipient,
                id: { in: ids },
                has_read: false,
            },
            data: {
                has_read: true,
                read_at: new Date(),
            },
        });

        return { count: result.count };
    }
}
