import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
    MarketStatus,
    ScopeType,
    StaffAuditAction,
    StaffInvitationStatus,
    WarehouseStatus,
    type Prisma,
    PrismaService,
} from '@app/common';
import {
    ACCESS_CONTROL_ERROR,
    assertActorBelongsToMarkets,
    assertCanManageRole,
    assertOperableScopeFilters,
    hasGlobalScope,
    resolveQueriedRoleScopeTypes,
    resolveScopeMarketIds,
} from '../shared/access-control.js';
import { STAFF_INVITATION_TTL_SECONDS } from '../shared/invitation.constants.js';
import { assertMarketsActive } from '../shared/assert-markets-active.js';
import type { FindStaffInvitationsDto } from './dto/find-staff-invitations.dto.js';
import type { InviteStaffDto } from './dto/invite-staff.dto.js';
import {
    INVITATION_REPO_ERROR,
    invitationDetailsInclude,
    invitationScopeAccessSelect,
    type StaffInvitationDetails,
    type StaffInvitationPage,
} from './types/index.js';

@Injectable()
export class InvitationsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(
        data: InviteStaffDto,
        invited_by_staff_id: string,
    ): Promise<StaffInvitationDetails & { plain_token: string }> {
        return await this.prisma.$transaction(async (tx) => {
            const actor = await tx.staff.findUnique({
                where: { id: invited_by_staff_id },
                select: {
                    id: true,
                    name: true,
                    staff_scopes: { select: invitationScopeAccessSelect },
                    role: { select: { hierarchy: true, scope_type: true } },
                },
            });
            if (!actor) {
                throw new Error(INVITATION_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
            }

            const existingStaff = await tx.staff.findUnique({
                where: { email: data.email },
                select: { id: true },
            });
            if (existingStaff) {
                throw new Error(INVITATION_REPO_ERROR.STAFF_EMAIL_EXISTS);
            }

            const pendingInvitation = await tx.staffInvitation.findFirst({
                where: {
                    email: data.email,
                    status: StaffInvitationStatus.PENDING,
                },
                select: { id: true },
            });
            if (pendingInvitation) {
                throw new Error(INVITATION_REPO_ERROR.PENDING_INVITATION_EXISTS);
            }

            const role = await tx.role.findUnique({
                where: { id: data.role_id },
                select: {
                    id: true,
                    name: true,
                    hierarchy: true,
                    scope_type: true,
                },
            });
            if (!role) {
                throw new Error(INVITATION_REPO_ERROR.ROLE_NOT_FOUND);
            }

            if (role.scope_type !== data.scope_type) {
                throw new Error(INVITATION_REPO_ERROR.ROLE_SCOPE_MISMATCH);
            }

            assertCanManageRole(actor.role ?? {}, role);

            const actorIsGlobal = hasGlobalScope(actor.staff_scopes);
            const actorMarketIds = resolveScopeMarketIds(actor.staff_scopes);

            let invitationScopes: Array<{
                scope_type: ScopeType;
                market?: { connect: { id: string } };
                warehouse?: { connect: { id: string } };
                distribution_point?: { connect: { id: string } };
            }>;

            if (data.scope_type === ScopeType.GLOBAL) {
                invitationScopes = [{ scope_type: ScopeType.GLOBAL }];
            } else if (data.scope_type === ScopeType.MARKET) {
                const market_ids = data.market_ids ?? [];
                const markets = await tx.market.findMany({
                    where: { id: { in: market_ids } },
                    select: { id: true, status: true },
                });
                if (markets.length !== market_ids.length) {
                    throw new Error(INVITATION_REPO_ERROR.MARKETS_NOT_FOUND);
                }
                assertMarketsActive(markets);
                assertActorBelongsToMarkets(
                    actorMarketIds,
                    market_ids,
                    actorIsGlobal,
                );
                invitationScopes = market_ids.map((market_id) => ({
                    scope_type: ScopeType.MARKET,
                    market: { connect: { id: market_id } },
                }));
            } else if (data.scope_type === ScopeType.WAREHOUSE) {
                const warehouse_ids = data.warehouse_ids ?? [];
                const warehouses = await tx.warehouse.findMany({
                    where: { id: { in: warehouse_ids } },
                    select: { id: true, market_id: true },
                });
                if (warehouses.length !== warehouse_ids.length) {
                    throw new Error(INVITATION_REPO_ERROR.WAREHOUSES_NOT_FOUND);
                }
                assertActorBelongsToMarkets(
                    actorMarketIds,
                    warehouses.map((warehouse) => warehouse.market_id),
                    actorIsGlobal,
                );
                invitationScopes = warehouse_ids.map((warehouse_id) => ({
                    scope_type: ScopeType.WAREHOUSE,
                    warehouse: { connect: { id: warehouse_id } },
                }));
            } else {
                const distribution_point_ids =
                    data.distribution_point_ids ?? [];
                const distributionPoints =
                    await tx.distributionPoint.findMany({
                        where: { id: { in: distribution_point_ids } },
                        select: { id: true, market_id: true },
                    });
                if (
                    distributionPoints.length !==
                    distribution_point_ids.length
                ) {
                    throw new Error(
                        INVITATION_REPO_ERROR.DISTRIBUTION_POINTS_NOT_FOUND,
                    );
                }
                assertActorBelongsToMarkets(
                    actorMarketIds,
                    distributionPoints.map((point) => point.market_id),
                    actorIsGlobal,
                );
                invitationScopes = distribution_point_ids.map(
                    (distribution_point_id) => ({
                        scope_type: ScopeType.DISTRIBUTION_POINT,
                        distribution_point: {
                            connect: { id: distribution_point_id },
                        },
                    }),
                );
            }

            const plain_token = randomBytes(32).toString('base64url');
            const expires_at = new Date(
                Date.now() + STAFF_INVITATION_TTL_SECONDS * 1000,
            );

            const invitation = await tx.staffInvitation.create({
                data: {
                    name: data.name,
                    email: data.email,
                    token: plain_token,
                    role: { connect: { id: role.id } },
                    invited_by: { connect: { id: actor.id } },
                    expires_at,
                    ...(data.phone_number !== undefined && {
                        phone_number: data.phone_number,
                    }),
                    invitation_scopes: {
                        create: invitationScopes,
                    },
                },
                include: invitationDetailsInclude,
            });

            return { ...invitation, plain_token };
        });
    }

    async findAll(
        query: FindStaffInvitationsDto,
        market_ids: string[],
        hierarchy: number | null,
        actor_scope_type: ScopeType | null,
    ): Promise<StaffInvitationPage> {
        if (hierarchy === null) {
            return { items: [], next_cursor: null };
        }

        const scopeFilter = this.buildInvitationScopeFilter(
            query,
            actor_scope_type,
            market_ids,
        );
        if (scopeFilter === null) {
            return { items: [], next_cursor: null };
        }

        const limit = query.limit ?? 20;
        const records = await this.prisma.staffInvitation.findMany({
            where: {
                ...(query.status !== undefined && { status: query.status }),
                ...(query.role_id !== undefined && { role_id: query.role_id }),
                invitation_scopes: scopeFilter,
                role: {
                    hierarchy: { gt: hierarchy },
                },
            },
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
            include: invitationDetailsInclude,
        });

        const hasMore = records.length > limit;
        const items = hasMore ? records.slice(0, limit) : records;

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1]!.id : null,
        };
    }

    async findByIdInScope(
        id: string,
        market_ids: string[],
        hierarchy: number | null,
        actor_scope_type: ScopeType | null,
    ): Promise<StaffInvitationDetails | null> {
        if (hierarchy === null) {
            return null;
        }

        const scopeFilter = this.buildInvitationScopeFilter(
            {},
            actor_scope_type,
            market_ids,
        );
        if (scopeFilter === null) {
            return null;
        }

        return await this.prisma.staffInvitation.findFirst({
            where: {
                id,
                invitation_scopes: scopeFilter,
                role: {
                    hierarchy: { gt: hierarchy },
                },
            },
            include: invitationDetailsInclude,
        });
    }

    async cancel(
        id: string,
        performed_by_staff_id: string,
    ): Promise<StaffInvitationDetails> {
        return await this.prisma.$transaction(async (tx) => {
            await this.assertCanManageInvitation(tx, id, performed_by_staff_id, {
                allowExpired: false,
            });

            return await tx.staffInvitation.update({
                where: { id },
                data: {
                    status: StaffInvitationStatus.CANCELLED,
                    cancelled_at: new Date(),
                },
                include: invitationDetailsInclude,
            });
        });
    }

    async resend(
        id: string,
        performed_by_staff_id: string,
    ): Promise<StaffInvitationDetails & { plain_token: string }> {
        return await this.prisma.$transaction(async (tx) => {
            await this.assertCanManageInvitation(tx, id, performed_by_staff_id, {
                allowExpired: true,
            });

            const plain_token = randomBytes(32).toString('base64url');
            const expires_at = new Date(
                Date.now() + STAFF_INVITATION_TTL_SECONDS * 1000,
            );

            const invitation = await tx.staffInvitation.update({
                where: { id },
                data: {
                    token: plain_token,
                    status: StaffInvitationStatus.PENDING,
                    expires_at,
                    cancelled_at: null,
                },
                include: invitationDetailsInclude,
            });

            return { ...invitation, plain_token };
        });
    }

    private async assertCanManageInvitation(
        tx: Pick<PrismaService, 'staff' | 'staffInvitation' | 'market'>,
        id: string,
        performed_by_staff_id: string,
        options: { allowExpired: boolean },
    ): Promise<void> {
        const actor = await tx.staff.findUnique({
            where: { id: performed_by_staff_id },
            select: {
                id: true,
                staff_scopes: { select: invitationScopeAccessSelect },
                role: { select: { hierarchy: true, scope_type: true } },
            },
        });
        if (!actor) {
            throw new Error(INVITATION_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
        }

        const invitation = await tx.staffInvitation.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                role: { select: { hierarchy: true, scope_type: true } },
                invitation_scopes: { select: invitationScopeAccessSelect },
            },
        });
        if (!invitation) {
            throw new Error(INVITATION_REPO_ERROR.INVITATION_NOT_FOUND);
        }

        const resendableStatuses: StaffInvitationStatus[] = options.allowExpired
            ? [StaffInvitationStatus.PENDING, StaffInvitationStatus.EXPIRED]
            : [StaffInvitationStatus.PENDING];
        if (!resendableStatuses.includes(invitation.status)) {
            throw new Error(INVITATION_REPO_ERROR.INVITATION_NOT_PENDING);
        }

        assertCanManageRole(actor.role ?? {}, invitation.role);

        const actorIsGlobal = hasGlobalScope(actor.staff_scopes);
        if (hasGlobalScope(invitation.invitation_scopes)) {
            if (!actorIsGlobal) {
                throw new Error(
                    ACCESS_CONTROL_ERROR.INSUFFICIENT_MARKET_ACCESS,
                );
            }
        } else {
            assertActorBelongsToMarkets(
                resolveScopeMarketIds(actor.staff_scopes),
                resolveScopeMarketIds(invitation.invitation_scopes),
                actorIsGlobal,
            );
        }
    }

    async accept(
        email: string,
        token: string,
        password: string,
    ): Promise<StaffInvitationDetails> {
        return await this.prisma.$transaction(async (tx) => {
            const invitation = await tx.staffInvitation.findUnique({
                where: { token },
                include: invitationDetailsInclude,
            });
            if (!invitation) {
                throw new Error(INVITATION_REPO_ERROR.INVITATION_NOT_FOUND);
            }
            if (invitation.email.toLowerCase() !== email.toLowerCase()) {
                throw new Error(INVITATION_REPO_ERROR.INVITATION_EMAIL_MISMATCH);
            }
            if (invitation.status === StaffInvitationStatus.ACCEPTED) {
                throw new Error(
                    INVITATION_REPO_ERROR.INVITATION_ALREADY_ACCEPTED,
                );
            }
            if (invitation.status === StaffInvitationStatus.CANCELLED) {
                throw new Error(INVITATION_REPO_ERROR.INVITATION_CANCELLED);
            }
            if (invitation.status === StaffInvitationStatus.EXPIRED) {
                throw new Error(INVITATION_REPO_ERROR.INVITATION_EXPIRED);
            }
            if (invitation.status !== StaffInvitationStatus.PENDING) {
                throw new Error(INVITATION_REPO_ERROR.INVITATION_NOT_PENDING);
            }
            if (invitation.expires_at.getTime() <= Date.now()) {
                await tx.staffInvitation.update({
                    where: { id: invitation.id },
                    data: { status: StaffInvitationStatus.EXPIRED },
                });
                throw new Error(INVITATION_REPO_ERROR.INVITATION_EXPIRED);
            }

            const existingStaff = await tx.staff.findUnique({
                where: { email: invitation.email },
                select: { id: true },
            });
            if (existingStaff) {
                await this.cancelInvitation(tx, invitation.id);
                throw new Error(INVITATION_REPO_ERROR.STAFF_EMAIL_EXISTS);
            }

            const role = await tx.role.findUnique({
                where: { id: invitation.role_id },
                select: { id: true, name: true },
            });
            if (!role) {
                await this.cancelInvitation(tx, invitation.id);
                throw new Error(INVITATION_REPO_ERROR.INVITATION_ROLE_UNAVAILABLE);
            }

            if (invitation.invitation_scopes.length === 0) {
                await this.cancelInvitation(tx, invitation.id);
                throw new Error(
                    INVITATION_REPO_ERROR.INVITATION_SCOPES_UNAVAILABLE,
                );
            }

            let markets: { id: string; name: string }[];
            try {
                markets = await this.assertInvitationScopesAvailable(
                    tx,
                    invitation.invitation_scopes,
                );
            } catch (error) {
                await this.cancelInvitation(tx, invitation.id);
                throw error;
            }

            let staff: { id: string; name: string };
            try {
                staff = await tx.staff.create({
                    data: {
                        name: invitation.name,
                        email: invitation.email,
                        password,
                        staff_number: `STF-${randomBytes(4).toString('hex').toUpperCase()}`,
                        role: { connect: { id: invitation.role_id } },
                        ...(invitation.phone_number !== null && {
                            phone_number: invitation.phone_number,
                        }),
                        staff_scopes: {
                            create: invitation.invitation_scopes.map((scope) => ({
                                scope_type: scope.scope_type,
                                ...(scope.market_id != null && {
                                    market: { connect: { id: scope.market_id } },
                                }),
                                ...(scope.warehouse_id != null && {
                                    warehouse: {
                                        connect: { id: scope.warehouse_id },
                                    },
                                }),
                                ...(scope.distribution_point_id != null && {
                                    distribution_point: {
                                        connect: {
                                            id: scope.distribution_point_id,
                                        },
                                    },
                                }),
                            })),
                        },
                    },
                    select: { id: true, name: true },
                });
            } catch (error) {
                if (error instanceof PrismaClientKnownRequestError) {
                    if (error.code === 'P2002') {
                        await this.cancelInvitation(tx, invitation.id);
                        throw new Error(
                            INVITATION_REPO_ERROR.STAFF_EMAIL_EXISTS,
                        );
                    }
                    if (error.code === 'P2003' || error.code === 'P2025') {
                        await this.cancelInvitation(tx, invitation.id);
                        const field = String(error.meta?.field_name ?? '');
                        const cause = String(error.meta?.cause ?? '');
                        const hint =
                            `${field} ${cause} ${error.message}`.toLowerCase();
                        if (hint.includes('role')) {
                            throw new Error(
                                INVITATION_REPO_ERROR.INVITATION_ROLE_UNAVAILABLE,
                            );
                        }
                        if (
                            hint.includes('warehouse') ||
                            hint.includes('warehouse_id')
                        ) {
                            throw new Error(
                                INVITATION_REPO_ERROR.INVITATION_WAREHOUSES_UNAVAILABLE,
                            );
                        }
                        if (
                            hint.includes('distribution_point') ||
                            hint.includes('distribution_point_id')
                        ) {
                            throw new Error(
                                INVITATION_REPO_ERROR.INVITATION_DISTRIBUTION_POINTS_UNAVAILABLE,
                            );
                        }
                        if (
                            hint.includes('market') ||
                            hint.includes('market_id')
                        ) {
                            throw new Error(
                                INVITATION_REPO_ERROR.INVITATION_MARKETS_UNAVAILABLE,
                            );
                        }
                        throw new Error(
                            INVITATION_REPO_ERROR.INVITATION_SCOPES_UNAVAILABLE,
                        );
                    }
                }
                throw error;
            }

            await tx.staffAudit.create({
                data: {
                    action: StaffAuditAction.STAFF_CREATED,
                    staff_id: staff.id,
                    staff_name: staff.name,
                    performed_by_staff_id: invitation.invited_by.id,
                    performed_by_staff_name: invitation.invited_by.name,
                    role_id: role.id,
                    role_name: role.name,
                },
            });

            for (const market of markets) {
                await tx.staffAudit.create({
                    data: {
                        action: StaffAuditAction.SCOPE_ASSIGNED,
                        staff_id: staff.id,
                        staff_name: staff.name,
                        performed_by_staff_id: invitation.invited_by.id,
                        performed_by_staff_name: invitation.invited_by.name,
                        market_id: market.id,
                        market_name: market.name,
                    },
                });
            }

            return await tx.staffInvitation.update({
                where: { id: invitation.id },
                data: {
                    status: StaffInvitationStatus.ACCEPTED,
                    accepted_at: new Date(),
                    staff: { connect: { id: staff.id } },
                },
                include: invitationDetailsInclude,
            });
        });
    }

    private async cancelInvitation(
        tx: Pick<PrismaService, 'staffInvitation'>,
        id: string,
    ): Promise<void> {
        await tx.staffInvitation.update({
            where: { id },
            data: {
                status: StaffInvitationStatus.CANCELLED,
                cancelled_at: new Date(),
            },
        });
    }

    private async assertInvitationScopesAvailable(
        tx: Pick<
            PrismaService,
            'market' | 'warehouse' | 'distributionPoint'
        >,
        invitation_scopes: Array<{
            scope_type: ScopeType;
            market_id: string | null;
            warehouse_id: string | null;
            distribution_point_id: string | null;
            warehouse?: { market_id: string } | null;
            distribution_point?: { market_id: string } | null;
        }>,
    ): Promise<{ id: string; name: string }[]> {
        if (hasGlobalScope(invitation_scopes)) {
            return [];
        }

        const market_ids = invitation_scopes
            .filter((scope) => scope.scope_type === ScopeType.MARKET)
            .map((scope) => scope.market_id)
            .filter((id): id is string => id != null);
        const warehouse_ids = invitation_scopes
            .filter((scope) => scope.scope_type === ScopeType.WAREHOUSE)
            .map((scope) => scope.warehouse_id)
            .filter((id): id is string => id != null);
        const distribution_point_ids = invitation_scopes
            .filter(
                (scope) => scope.scope_type === ScopeType.DISTRIBUTION_POINT,
            )
            .map((scope) => scope.distribution_point_id)
            .filter((id): id is string => id != null);

        const [markets, warehouses, distributionPoints] = await Promise.all([
            market_ids.length === 0
                ? Promise.resolve([])
                : tx.market.findMany({
                      where: { id: { in: market_ids } },
                      select: { id: true, name: true, status: true },
                  }),
            warehouse_ids.length === 0
                ? Promise.resolve([])
                : tx.warehouse.findMany({
                      where: { id: { in: warehouse_ids } },
                      select: {
                          id: true,
                          status: true,
                          market: { select: { id: true, name: true, status: true } },
                      },
                  }),
            distribution_point_ids.length === 0
                ? Promise.resolve([])
                : tx.distributionPoint.findMany({
                      where: { id: { in: distribution_point_ids } },
                      select: {
                          id: true,
                          is_active: true,
                          market: { select: { id: true, name: true, status: true } },
                      },
                  }),
        ]);

        if (markets.length !== market_ids.length) {
            throw new Error(
                INVITATION_REPO_ERROR.INVITATION_MARKETS_UNAVAILABLE,
            );
        }
        if (markets.some((market) => market.status !== MarketStatus.OPEN)) {
            throw new Error(
                INVITATION_REPO_ERROR.INVITATION_MARKETS_UNAVAILABLE,
            );
        }

        if (warehouses.length !== warehouse_ids.length) {
            throw new Error(
                INVITATION_REPO_ERROR.INVITATION_WAREHOUSES_UNAVAILABLE,
            );
        }
        if (
            warehouses.some(
                (warehouse) => warehouse.status !== WarehouseStatus.OPEN,
            )
        ) {
            throw new Error(
                INVITATION_REPO_ERROR.INVITATION_WAREHOUSES_UNAVAILABLE,
            );
        }
        if (
            warehouses.some(
                (warehouse) => warehouse.market.status !== MarketStatus.OPEN,
            )
        ) {
            throw new Error(
                INVITATION_REPO_ERROR.INVITATION_MARKETS_UNAVAILABLE,
            );
        }

        if (distributionPoints.length !== distribution_point_ids.length) {
            throw new Error(
                INVITATION_REPO_ERROR.INVITATION_DISTRIBUTION_POINTS_UNAVAILABLE,
            );
        }
        if (distributionPoints.some((point) => !point.is_active)) {
            throw new Error(
                INVITATION_REPO_ERROR.INVITATION_DISTRIBUTION_POINTS_UNAVAILABLE,
            );
        }
        if (
            distributionPoints.some(
                (point) => point.market.status !== MarketStatus.OPEN,
            )
        ) {
            throw new Error(
                INVITATION_REPO_ERROR.INVITATION_MARKETS_UNAVAILABLE,
            );
        }

        const auditMarkets = new Map<string, { id: string; name: string }>();
        for (const market of markets) {
            auditMarkets.set(market.id, {
                id: market.id,
                name: market.name,
            });
        }
        for (const warehouse of warehouses) {
            auditMarkets.set(warehouse.market.id, warehouse.market);
        }
        for (const point of distributionPoints) {
            auditMarkets.set(point.market.id, point.market);
        }

        return [...auditMarkets.values()];
    }

    private buildInvitationScopeFilter(
        query: Pick<
            FindStaffInvitationsDto,
            | 'scope_type'
            | 'market_id'
            | 'warehouse_id'
            | 'distribution_point_id'
        >,
        actor_scope_type: ScopeType | null,
        actor_market_ids: string[],
    ): Prisma.StaffInvitationScopeListRelationFilter | null {
        const scopes = resolveQueriedRoleScopeTypes(
            actor_scope_type,
            query.scope_type,
        );
        if (scopes === null) {
            return null;
        }

        assertOperableScopeFilters(actor_scope_type, {
            market_id: query.market_id,
            warehouse_id: query.warehouse_id,
            distribution_point_id: query.distribution_point_id,
        });

        const actorIsGlobal = actor_scope_type === ScopeType.GLOBAL;
        if (!actorIsGlobal && actor_market_ids.length === 0) {
            return null;
        }

        const some: Prisma.StaffInvitationScopeWhereInput = {
            scope_type: { in: scopes },
            ...(query.market_id !== undefined && {
                market_id: query.market_id,
            }),
            ...(query.warehouse_id !== undefined && {
                warehouse_id: query.warehouse_id,
            }),
            ...(query.distribution_point_id !== undefined && {
                distribution_point_id: query.distribution_point_id,
            }),
        };

        if (!actorIsGlobal) {
            some.AND = [
                {
                    OR: [
                        { market_id: { in: actor_market_ids } },
                        {
                            warehouse: {
                                market_id: { in: actor_market_ids },
                            },
                        },
                        {
                            distribution_point: {
                                market_id: { in: actor_market_ids },
                            },
                        },
                    ],
                },
            ];
        }

        return { some };
    }
}
