import { Injectable, NotFoundException } from '@nestjs/common';
import {
    LogisticsLocationType,
    Prisma,
    PrismaService,
    ScopeType,
    StaffAuditAction,
} from '@app/common';
import type { FindDistributionPointsDto } from './dto/find-distribution-points.dto.js';
import type { UpdateDistributionPointDto } from './dto/update-distribution-point.dto.js';
import {
    distributionPointListSelect,
    distributionPointSummarySelect,
    toDistributionPointListItem,
    toDistributionPointSummary,
} from './mappers/distribution-point.mapper.js';
import {
    distributionPointStaffSelect,
    type CreateDistributionPointRecord,
    type DistributionPointAuditActor,
    type DistributionPointRecord,
    type DistributionPointStaffMember,
    type DistributionPointWithAuditRelations,
} from './types/distribution-point.type.js';

@Injectable()
export class DistributionPointsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(
        data: CreateDistributionPointRecord,
    ): Promise<DistributionPointRecord> {
        const distributionPoint = await this.prisma.distributionPoint.create({
            data: {
                name: data.name,
                address: data.address,
                city: data.city,
                zip: data.zip,
                contact_phone: data.contact_phone,
                market: { connect: { id: data.market_id } },
                state: { connect: { id: data.state_id } },
                logistics_location: {
                    create: {
                        type: LogisticsLocationType.DISTRIBUTION_POINT,
                        name: data.name,
                        phone: data.contact_phone,
                        address: data.address,
                        city: data.city,
                        zip: data.zip,
                        state: data.state,
                        country: data.country,
                    },
                },
            },
            select: distributionPointSummarySelect,
        });
        return toDistributionPointSummary(distributionPoint);
    }

    async findAll(
        query: FindDistributionPointsDto,
        scope?: {
            market_ids?: string[];
            distribution_point_ids?: string[];
        },
    ) {
        const limit = query.limit ?? 50;
        const where: Prisma.DistributionPointWhereInput = {
            ...(query.market_id !== undefined && {
                market_id: query.market_id,
            }),
            ...(query.market_id === undefined &&
                scope?.market_ids !== undefined && {
                    market_id: { in: scope.market_ids },
                }),
            ...(scope?.distribution_point_ids !== undefined && {
                id: { in: scope.distribution_point_ids },
            }),
            ...(query.state_id !== undefined && {
                state_id: query.state_id,
            }),
            ...(query.is_active !== undefined && {
                is_active: query.is_active,
            }),
            ...(query.name !== undefined && {
                name: {
                    contains: query.name,
                    mode: 'insensitive',
                },
            }),
            ...(query.city !== undefined && {
                city: {
                    contains: query.city,
                    mode: 'insensitive',
                },
            }),
        };

        const records = await this.prisma.distributionPoint.findMany({
            where,
            select: distributionPointListSelect,
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
        });

        const hasMore = records.length > limit;
        const sliced = hasMore ? records.slice(0, limit) : records;

        return {
            items: sliced.map(toDistributionPointListItem),
            next_cursor: hasMore ? sliced[sliced.length - 1]!.id : null,
        };
    }

    async findById(id: string): Promise<DistributionPointRecord | null> {
        const distributionPoint =
            await this.prisma.distributionPoint.findUnique({
                where: { id },
                select: distributionPointSummarySelect,
            });
        return distributionPoint
            ? toDistributionPointSummary(distributionPoint)
            : null;
    }

    async findByIdOrThrow(id: string): Promise<DistributionPointRecord> {
        const distributionPoint = await this.findById(id);
        if (!distributionPoint) {
            throw new NotFoundException('Distribution point not found');
        }
        return distributionPoint;
    }

    async findByIdWithAuditRelationsOrThrow(
        id: string,
    ): Promise<DistributionPointWithAuditRelations> {
        const distributionPoint =
            await this.prisma.distributionPoint.findUnique({
                where: { id },
                include: {
                    market: { select: { id: true, name: true } },
                },
            });
        if (!distributionPoint) {
            throw new NotFoundException('Distribution point not found');
        }
        return distributionPoint;
    }

    async update(
        id: string,
        data: UpdateDistributionPointDto,
    ): Promise<DistributionPointRecord> {
        const distributionPoint = await this.prisma.distributionPoint.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.address !== undefined && { address: data.address }),
                ...(data.city !== undefined && { city: data.city }),
                ...(data.zip !== undefined && { zip: data.zip }),
                ...(data.contact_phone !== undefined && {
                    contact_phone: data.contact_phone,
                }),
            },
            select: distributionPointSummarySelect,
        });
        return toDistributionPointSummary(distributionPoint);
    }

    async close(id: string): Promise<DistributionPointRecord> {
        const distributionPoint = await this.prisma.distributionPoint.update({
            where: { id },
            data: { is_active: false },
            select: distributionPointSummarySelect,
        });
        return toDistributionPointSummary(distributionPoint);
    }

    async open(id: string): Promise<DistributionPointRecord> {
        const distributionPoint = await this.prisma.distributionPoint.update({
            where: { id },
            data: { is_active: true },
            select: distributionPointSummarySelect,
        });
        return toDistributionPointSummary(distributionPoint);
    }

    async findAssignedStaffIds(distributionPointId: string): Promise<string[]> {
        const scopes = await this.prisma.staffScope.findMany({
            where: {
                distribution_point_id: distributionPointId,
                scope_type: ScopeType.DISTRIBUTION_POINT,
            },
            select: { staff_id: true },
        });
        return scopes.map((scope) => scope.staff_id);
    }

    async assignStaff(
        distributionPointId: string,
        staffMembers: DistributionPointAuditActor[],
        performed_by: DistributionPointAuditActor,
        market: DistributionPointAuditActor,
    ): Promise<DistributionPointStaffMember[]> {
        const staffIds = staffMembers.map((member) => member.id);

        return await this.prisma.$transaction(async (tx) => {
            const existing = await tx.staffScope.findMany({
                where: {
                    distribution_point_id: distributionPointId,
                    staff_id: { in: staffIds },
                    scope_type: ScopeType.DISTRIBUTION_POINT,
                },
                select: { staff_id: true },
            });
            const alreadyAssigned = new Set(
                existing.map((scope) => scope.staff_id),
            );
            const toAssign = staffMembers.filter(
                (member) => !alreadyAssigned.has(member.id),
            );

            if (toAssign.length > 0) {
                await tx.staffScope.createMany({
                    data: toAssign.map((member) => ({
                        staff_id: member.id,
                        scope_type: ScopeType.DISTRIBUTION_POINT,
                        distribution_point_id: distributionPointId,
                    })),
                });

                await tx.staffAudit.createMany({
                    data: toAssign.map((member) => ({
                        action: StaffAuditAction.SCOPE_ASSIGNED,
                        staff_id: member.id,
                        staff_name: member.name,
                        performed_by_staff_id: performed_by.id,
                        performed_by_staff_name: performed_by.name,
                        market_id: market.id,
                        market_name: market.name,
                    })),
                });
            }

            const scopes = await tx.staffScope.findMany({
                where: {
                    distribution_point_id: distributionPointId,
                    staff_id: { in: staffIds },
                    scope_type: ScopeType.DISTRIBUTION_POINT,
                },
                select: distributionPointStaffSelect,
                orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            });

            return scopes.map((scope) => ({
                ...scope,
                distribution_point_id:
                    scope.distribution_point_id ?? distributionPointId,
            }));
        });
    }
}
