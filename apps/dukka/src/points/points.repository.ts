import { Injectable } from '@nestjs/common';
import {
    POINT_STATUS,
    type Points,
    type PointsHistory,
    PrismaService,
} from '@app/common';
import type { CreatePointsHistoryDto } from './dto/create-points-history.dto.js';
import type { FindPointsHistoryDto } from './dto/find-points-history.dto.js';

export type PointsChangeResult = {
    history: PointsHistory;
    points: Points;
};

export type PointsHistoryPage = {
    items: PointsHistory[];
    next_cursor: string | null;
};

@Injectable()
export class PointsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async earn(
        customer_id: string,
        data: CreatePointsHistoryDto,
    ): Promise<PointsChangeResult> {
        const historyData = {
            status: POINT_STATUS.EARNED,
            description: data.description,
            count: data.count,
        };

        const { points_history, ...points } = await this.prisma.points.upsert({
            where: { customer_id },
            create: {
                customer: {
                    connect: { id: customer_id },
                },
                balance: data.count,
                points_history: {
                    create: historyData,
                },
            },
            update: {
                balance: { increment: data.count },
                points_history: {
                    create: historyData,
                },
            },
            include: {
                points_history: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                },
            },
        });

        return { history: points_history[0], points };
    }

    async redeem(
        customer_id: string,
        data: CreatePointsHistoryDto,
    ): Promise<PointsChangeResult> {
        return await this.prisma.$transaction(async (tx) => {
            let points = await tx.points.findUnique({
                where: { customer_id },
            });

            if (!points) {
                points = await tx.points.create({
                    data: {
                        customer: { connect: { id: customer_id } },
                        balance: 0,
                    },
                });
            }

            const newBalance = points.balance - data.count;
            if (newBalance < 0) {
                throw new Error('INSUFFICIENT_POINTS');
            }

            const { points_history, ...updatedPoints } =
                await tx.points.update({
                    where: { id: points.id },
                    data: {
                        balance: newBalance,
                        points_history: {
                            create: {
                                status: POINT_STATUS.REDEEMED,
                                description: data.description,
                                count: data.count,
                            },
                        },
                    },
                    include: {
                        points_history: {
                            orderBy: { created_at: 'desc' },
                            take: 1,
                        },
                    },
                });

            return { history: points_history[0], points: updatedPoints };
        });
    }

    async findHistory(
        customer_id: string,
        query: FindPointsHistoryDto,
    ): Promise<PointsHistoryPage> {
        const limit = query.limit ?? 20;

        const records = await this.prisma.pointsHistory.findMany({
            where: {
                points: { customer_id },
                ...(query.status !== undefined && { status: query.status }),
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
}
