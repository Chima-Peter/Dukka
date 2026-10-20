import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
    StaffAuditAction,
    StaffInvitationStatus,
    type Market,
    type Role,
    type Staff,
    type StaffInvitation,
    type StaffInvitationMarket,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
    assertActorBelongsToMarkets,
    assertCanManageHierarchies,
} from '../shared/access-control.js';
import { STAFF_INVITATION_TTL_SECONDS } from '../shared/invitation.constants.js';
import { assertMarketsActive } from '../shared/assert-markets-active.js';
import type { FindStaffInvitationsDto } from './dto/find-staff-invitations.dto.js';
import type { InviteStaffDto } from './dto/invite-staff.dto.js';

export const INVITATION_REPO_ERROR = {
    PERFORMING_STAFF_NOT_FOUND: 'PERFORMING_STAFF_NOT_FOUND',
    ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
    MARKETS_NOT_FOUND: 'MARKETS_NOT_FOUND',
    STAFF_EMAIL_EXISTS: 'STAFF_EMAIL_EXISTS',
    PENDING_INVITATION_EXISTS: 'PENDING_INVITATION_EXISTS',
    INVITATION_NOT_FOUND: 'INVITATION_NOT_FOUND',
    INVITATION_NOT_PENDING: 'INVITATION_NOT_PENDING',
    INVITATION_ALREADY_ACCEPTED: 'INVITATION_ALREADY_ACCEPTED',
    INVITATION_CANCELLED: 'INVITATION_CANCELLED',
    INVITATION_EXPIRED: 'INVITATION_EXPIRED',
    INVITATION_EMAIL_MISMATCH: 'INVITATION_EMAIL_MISMATCH',
    INVITATION_ROLE_UNAVAILABLE: 'INVITATION_ROLE_UNAVAILABLE',
    INVITATION_MARKETS_UNAVAILABLE: 'INVITATION_MARKETS_UNAVAILABLE',
} as const;

export type InvitationMarketDetails = StaffInvitationMarket & {
    market: Market;
};

export type StaffInvitationDetails = StaffInvitation & {
    role: Pick<Role, 'id' | 'name' | 'hierarchy' | 'description'>;
    invited_by: Pick<Staff, 'id' | 'name' | 'email'>;
    invitation_markets: InvitationMarketDetails[];
};

export type StaffInvitationPage = {
    items: StaffInvitationDetails[];
    next_cursor: string | null;
};

const invitationDetailsInclude = {
    role: {
        select: {
            id: true,
            name: true,
            hierarchy: true,
            description: true,
        },
    },
    invited_by: {
        select: {
            id: true,
            name: true,
            email: true,
        },
    },
    invitation_markets: {
        include: { market: true },
        orderBy: { created_at: 'desc' as const },
    },
} as const;

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
                    staff_markets: { select: { market_id: true } },
                    role: { select: { hierarchy: true } },
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
                select: { id: true, name: true, hierarchy: true },
            });
            if (!role) {
                throw new Error(INVITATION_REPO_ERROR.ROLE_NOT_FOUND);
            }

            const markets = await tx.market.findMany({
                where: { id: { in: data.market_ids } },
                select: { id: true, is_active: true },
            });
            if (markets.length !== data.market_ids.length) {
                throw new Error(INVITATION_REPO_ERROR.MARKETS_NOT_FOUND);
            }
            assertMarketsActive(markets);

            assertCanManageHierarchies(
                actor.role?.hierarchy,
                role.hierarchy,
            );
            assertActorBelongsToMarkets(
                actor.staff_markets.map((sm) => sm.market_id),
                data.market_ids,
            );

            const plain_token = randomBytes(32).toString('base64url');
            const expires_at = new Date(
                Date.now() + STAFF_INVITATION_TTL_SECONDS * 1000,
            );

            const invitation = await tx.staffInvitation.create({
                data: {
                    name: data.name,
                    email: data.email,
                    token: plain_token,
                    role_id: role.id,
                    invited_by_staff_id: actor.id,
                    expires_at,
                    ...(data.phone_number !== undefined && {
                        phone_number: data.phone_number,
                    }),
                    invitation_markets: {
                        create: data.market_ids.map((market_id) => ({
                            market_id,
                        })),
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
    ): Promise<StaffInvitationPage> {
        const scopedMarketIds = this.resolveMarketScope(
            market_ids,
            query.market_id,
        );
        if (scopedMarketIds.length === 0 || hierarchy === null) {
            return { items: [], next_cursor: null };
        }

        const limit = query.limit ?? 20;
        const records = await this.prisma.staffInvitation.findMany({
            where: {
                ...(query.status !== undefined && { status: query.status }),
                ...(query.role_id !== undefined && { role_id: query.role_id }),
                invitation_markets: {
                    some: { market_id: { in: scopedMarketIds } },
                },
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
    ): Promise<StaffInvitationDetails | null> {
        if (market_ids.length === 0 || hierarchy === null) {
            return null;
        }

        return await this.prisma.staffInvitation.findFirst({
            where: {
                id,
                invitation_markets: {
                    some: { market_id: { in: market_ids } },
                },
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
        tx: Pick<PrismaService, 'staff' | 'staffInvitation'>,
        id: string,
        performed_by_staff_id: string,
        options: { allowExpired: boolean },
    ): Promise<void> {
        const actor = await tx.staff.findUnique({
            where: { id: performed_by_staff_id },
            select: {
                id: true,
                staff_markets: { select: { market_id: true } },
                role: { select: { hierarchy: true } },
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
                role: { select: { hierarchy: true } },
                invitation_markets: { select: { market_id: true } },
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

        assertCanManageHierarchies(
            actor.role?.hierarchy,
            invitation.role.hierarchy,
        );
        assertActorBelongsToMarkets(
            actor.staff_markets.map((sm) => sm.market_id),
            invitation.invitation_markets.map((im) => im.market_id),
        );
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

            const market_ids = invitation.invitation_markets.map(
                (im) => im.market_id,
            );
            if (market_ids.length === 0) {
                await this.cancelInvitation(tx, invitation.id);
                throw new Error(
                    INVITATION_REPO_ERROR.INVITATION_MARKETS_UNAVAILABLE,
                );
            }

            const markets = await tx.market.findMany({
                where: { id: { in: market_ids } },
                select: { id: true, name: true, is_active: true },
            });
            if (
                markets.length !== market_ids.length ||
                markets.some((market) => !market.is_active)
            ) {
                await this.cancelInvitation(tx, invitation.id);
                throw new Error(
                    INVITATION_REPO_ERROR.INVITATION_MARKETS_UNAVAILABLE,
                );
            }

            let staff: { id: string; name: string };
            try {
                staff = await tx.staff.create({
                    data: {
                        name: invitation.name,
                        email: invitation.email,
                        password,
                        role_id: invitation.role_id,
                        ...(invitation.phone_number !== null && {
                            phone_number: invitation.phone_number,
                        }),
                        staff_markets: {
                            create: market_ids.map((market_id) => ({
                                market_id,
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
                    if (error.code === 'P2003') {
                        await this.cancelInvitation(tx, invitation.id);
                        const field = String(error.meta?.field_name ?? '');
                        if (field.includes('role')) {
                            throw new Error(
                                INVITATION_REPO_ERROR.INVITATION_ROLE_UNAVAILABLE,
                            );
                        }
                        throw new Error(
                            INVITATION_REPO_ERROR.INVITATION_MARKETS_UNAVAILABLE,
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
                        action: StaffAuditAction.MARKET_ASSIGNED,
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
                    staff_id: staff.id,
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

    private resolveMarketScope(
        actor_market_ids: string[],
        market_id?: string,
    ): string[] {
        if (market_id === undefined) {
            return actor_market_ids;
        }
        return actor_market_ids.includes(market_id) ? [market_id] : [];
    }
}
