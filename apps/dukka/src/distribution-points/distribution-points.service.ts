import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
    NotificationPublisher,
    NotificationType,
    ScopeType,
} from '@app/common';
import { ServiceStateService } from '../service/service-state.service.js';
import {
    ACCESS_CONTROL_ERROR,
    assertActorHasScopedAccess,
    hasGlobalScope,
    resolveActorDistributionPointIds,
    type ScopedAccessActor,
} from '../shared/access-control.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import { StaffService } from '../staff/staff.service.js';
import type { AssignDistributionPointStaffDto } from './dto/assign-distribution-point-staff.dto.js';
import type { CreateDistributionPointDto } from './dto/create-distribution-point.dto.js';
import type { FindDistributionPointsDto } from './dto/find-distribution-points.dto.js';
import type { UpdateDistributionPointDto } from './dto/update-distribution-point.dto.js';
import { DistributionPointsRepository } from './distribution-points.repository.js';
import type { StaffMemberSummary } from '../staff/types/staff.types.js';
import type {
    DistributionPointAuditActor,
    DistributionPointRecord,
    DistributionPointStaffMember,
} from './types/distribution-point.type.js';

@Injectable()
export class DistributionPointsService {
    private readonly logger = new Logger(DistributionPointsService.name);

    constructor(
        private readonly distributionPointsRepository: DistributionPointsRepository,
        private readonly staffService: StaffService,
        private readonly serviceStateService: ServiceStateService,
        private readonly notificationPublisher: NotificationPublisher,
    ) {}

    async create(
        data: CreateDistributionPointDto,
        actor: ScopedAccessActor,
    ): Promise<DistributionPointRecord> {
        try {
            this.logger.log(
                `Creating distribution point ${data.name} in market ${data.market_id}`,
            );
            assertActorHasScopedAccess(actor, { market_id: data.market_id });
            const serviceState =
                await this.serviceStateService.requireOpenInMarket(
                    data.state_id,
                    data.market_id,
                );
            const distributionPoint =
                await this.distributionPointsRepository.create({
                    ...data,
                    state: serviceState.state_name,
                    country: serviceState.country,
                });
            this.logger.log(
                `Distribution point created ${distributionPoint.id}`,
            );
            return distributionPoint;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(query: FindDistributionPointsDto, actor: ScopedAccessActor) {
        try {
            this.logger.log('Fetching distribution points');
            const scope = this.resolveDistributionPointListScope(query, actor);
            if (scope === null) {
                return { items: [], next_cursor: null };
            }
            const page = await this.distributionPointsRepository.findAll(
                query,
                scope,
            );
            this.logger.log('Fetched distribution points');
            return {
                items: page.items,
                next_cursor: page.next_cursor,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(
        id: string,
        actor?: ScopedAccessActor,
    ): Promise<DistributionPointRecord> {
        try {
            this.logger.log(`Fetching distribution point ${id}`);
            const distributionPoint =
                await this.distributionPointsRepository.findByIdOrThrow(id);
            if (actor !== undefined) {
                assertActorHasScopedAccess(actor, {
                    market_id: distributionPoint.market_id,
                    distribution_point_id: distributionPoint.id,
                });
            }
            this.logger.log(`Fetched distribution point ${id}`);
            return distributionPoint;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findStaff(
        id: string,
        actor: ScopedAccessActor,
    ): Promise<StaffMemberSummary[]> {
        try {
            this.logger.log(`Fetching staff for distribution point ${id}`);
            const distributionPoint =
                await this.distributionPointsRepository.findByIdOrThrow(id);
            assertActorHasScopedAccess(actor, {
                market_id: distributionPoint.market_id,
                distribution_point_id: distributionPoint.id,
            });
            const staff =
                await this.staffService.findSummariesByDistributionPointId(
                    distributionPoint.id,
                );
            this.logger.log(`Fetched staff for distribution point ${id}`);
            return staff;
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(
        id: string,
        data: UpdateDistributionPointDto,
        actor: ScopedAccessActor,
    ): Promise<DistributionPointRecord> {
        try {
            this.logger.log(`Updating distribution point ${id}`);
            const existing =
                await this.distributionPointsRepository.findByIdOrThrow(id);
            assertActorHasScopedAccess(actor, {
                market_id: existing.market_id,
                distribution_point_id: existing.id,
            });
            if (!existing.is_active) {
                throw new BadRequestException(
                    'Cannot update an inactive distribution point',
                );
            }
            const distributionPoint =
                await this.distributionPointsRepository.update(id, data);
            this.logger.log(`Distribution point updated ${id}`);
            return distributionPoint;
        } catch (error) {
            this.handleError(error);
        }
    }

    async close(
        id: string,
        actor: ScopedAccessActor,
    ): Promise<DistributionPointRecord> {
        try {
            this.logger.log(`Closing distribution point ${id}`);
            const existing =
                await this.distributionPointsRepository.findByIdOrThrow(id);
            assertActorHasScopedAccess(actor, {
                market_id: existing.market_id,
                distribution_point_id: existing.id,
            });
            if (!existing.is_active) {
                throw new BadRequestException(
                    'Distribution point is already closed',
                );
            }
            const distributionPoint =
                await this.distributionPointsRepository.close(id);
            this.logger.log(`Distribution point closed ${id}`);

            await this.notifyAssignedStaff(
                id,
                'Distribution point closed',
                `${distributionPoint.name} has been closed.`,
            );

            return distributionPoint;
        } catch (error) {
            this.handleError(error);
        }
    }

    async open(
        id: string,
        actor: ScopedAccessActor,
    ): Promise<DistributionPointRecord> {
        try {
            this.logger.log(`Opening distribution point ${id}`);
            const existing =
                await this.distributionPointsRepository.findByIdOrThrow(id);
            assertActorHasScopedAccess(actor, {
                market_id: existing.market_id,
                distribution_point_id: existing.id,
            });
            if (existing.is_active) {
                throw new BadRequestException(
                    'Distribution point is already open',
                );
            }
            const distributionPoint =
                await this.distributionPointsRepository.open(id);
            this.logger.log(`Distribution point opened ${id}`);

            await this.notifyAssignedStaff(
                id,
                'Distribution point opened',
                `${distributionPoint.name} has been opened.`,
            );

            return distributionPoint;
        } catch (error) {
            this.handleError(error);
        }
    }

    async assignStaff(
        id: string,
        data: AssignDistributionPointStaffDto,
        actor: ScopedAccessActor,
        performed_by: DistributionPointAuditActor,
    ): Promise<DistributionPointStaffMember[]> {
        try {
            this.logger.log(
                `Assigning ${data.staff_ids.length} staff to distribution point ${id}`,
            );
            const existing =
                await this.distributionPointsRepository.findByIdWithAuditRelationsOrThrow(
                    id,
                );
            assertActorHasScopedAccess(actor, {
                market_id: existing.market_id,
                distribution_point_id: existing.id,
            });
            if (!existing.is_active) {
                throw new BadRequestException(
                    'Cannot assign staff to an inactive distribution point',
                );
            }

            const staffMembers = await this.assertDistributionPointStaffValid(
                data.staff_ids,
            );
            const assigned =
                await this.distributionPointsRepository.assignStaff(
                    id,
                    staffMembers,
                    performed_by,
                    existing.market,
                );
            this.logger.log(`Assigned staff to distribution point ${id}`);

            await Promise.all(
                staffMembers.map((member) =>
                    this.notificationPublisher.notifyStaff(member.id, {
                        title: 'Distribution point assigned',
                        type: NotificationType.SYSTEM,
                        text: `You have been assigned to ${existing.name}.`,
                    }),
                ),
            );

            return assigned;
        } catch (error) {
            this.handleError(error);
        }
    }

    private async notifyAssignedStaff(
        distributionPointId: string,
        title: string,
        text: string,
    ): Promise<void> {
        const staffIds =
            await this.distributionPointsRepository.findAssignedStaffIds(
                distributionPointId,
            );
        await Promise.all(
            staffIds.map((staffId) =>
                this.notificationPublisher.notifyStaff(staffId, {
                    title,
                    type: NotificationType.SYSTEM,
                    text,
                }),
            ),
        );
    }

    private resolveDistributionPointListScope(
        query: FindDistributionPointsDto,
        actor: ScopedAccessActor,
    ): { market_ids?: string[]; distribution_point_ids?: string[] } | null {
        if (hasGlobalScope(actor.scopes)) {
            return {};
        }

        const hasMarketScope = actor.scopes.some(
            (scope) => scope.scope_type === 'MARKET',
        );
        if (hasMarketScope) {
            if (actor.market_ids.length === 0) {
                return null;
            }
            if (
                query.market_id !== undefined &&
                !actor.market_ids.includes(query.market_id)
            ) {
                throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
            }
            return { market_ids: [...actor.market_ids] };
        }

        const distributionPointIds = resolveActorDistributionPointIds(
            actor.scopes,
        );
        if (distributionPointIds.length === 0) {
            return null;
        }
        return { distribution_point_ids: distributionPointIds };
    }

    private async assertDistributionPointStaffValid(
        staffIds: string[],
    ): Promise<DistributionPointAuditActor[]> {
        const result = await this.staffService.validateIds({
            staff_ids: staffIds,
            permissions: [],
            scope: { scope_type: ScopeType.DISTRIBUTION_POINT },
        });

        const invalid = staffIds.filter((id) => !result.staff[id]?.valid);
        if (invalid.length > 0) {
            const parts: string[] = [];
            if (invalid.some((id) => !result.staff[id]?.exists)) {
                parts.push('One or more staff members were not found');
            }
            if (
                invalid.some(
                    (id) =>
                        result.staff[id]?.exists &&
                        !result.staff[id]?.is_active,
                )
            ) {
                parts.push('One or more staff accounts are inactive');
            }
            if (
                invalid.some(
                    (id) =>
                        result.staff[id]?.exists &&
                        result.staff[id]?.is_active &&
                        !result.staff[id]?.has_scope,
                )
            ) {
                parts.push(
                    'One or more staff must have a distribution-point-scoped role',
                );
            }
            throw new BadRequestException({
                message:
                    parts.length > 0
                        ? parts.join('; ')
                        : 'Distribution point staff are invalid',
                staff: result.staff,
            });
        }

        return staffIds.map((id) => {
            const staff = result.staff[id];
            return { id: staff.id, name: staff.name! };
        });
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (
            error instanceof Error &&
            (error.message === ACCESS_CONTROL_ERROR.INSUFFICIENT_MARKET_ACCESS ||
                error.message === ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS)
        ) {
            throw new ForbiddenException(
                'Cannot operate outside your assigned scope',
            );
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException('Distribution point conflict');
            }
            if (error.code === 'P2003' || error.code === 'P2025') {
                this.logger.warn(
                    `Distribution point relation error ${error.code}: ${error.message}`,
                );
                throw this.distributionPointRelationNotFound(error);
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }

    private distributionPointRelationNotFound(
        error: PrismaClientKnownRequestError,
    ): NotFoundException {
        switch (prismaMissingRecordModel(error)) {
            case 'market':
                return new NotFoundException('Market not found');
            case 'servicestate':
                return new NotFoundException('Service state not found');
            case 'staff':
                return new NotFoundException('Staff not found');
            case 'distributionpoint':
                return new NotFoundException('Distribution point not found');
            default:
                break;
        }

        if (prismaHintIncludes(error, 'market_id', "'market'")) {
            return new NotFoundException('Market not found');
        }
        if (prismaHintIncludes(error, 'state_id', 'servicestate', "'state'")) {
            return new NotFoundException('Service state not found');
        }
        if (prismaHintIncludes(error, 'staff')) {
            return new NotFoundException('Staff not found');
        }
        return new NotFoundException('Distribution point not found');
    }
}
