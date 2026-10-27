import { Injectable, Logger } from '@nestjs/common';
import {
    PrismaService,
    RedisService,
    STAFF_ACCESS_TOKEN_TTL_SECONDS,
    StaffAuditAction,
    TokenType,
    blacklistedTokenKey,
} from '@app/common';
import {
    MAIL_TEMPLATES,
    MailQueueService,
    type StaffDeactivatedJobPayload,
} from '@app/queues';

@Injectable()
export class StaffDeactivatedService {
    private readonly logger = new Logger(StaffDeactivatedService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService,
        private readonly mailQueueService: MailQueueService,
    ) {}

    async process(payload: StaffDeactivatedJobPayload): Promise<void> {
        const { staff_id, performed_by_staff_id } = payload;

        this.logger.log(`Deactivating staff ${staff_id}`);

        let email = payload.email ?? null;
        let name = payload.name ?? null;
        let role_id = payload.role_id ?? null;
        let role_name = payload.role_name ?? null;
        let performed_by_staff_name = payload.performed_by_staff_name ?? null;

        if (!email || !name) {
            const staff = await this.prisma.staff.findUnique({
                where: { id: staff_id },
                select: {
                    email: true,
                    name: true,
                    role: { select: { id: true, name: true } },
                },
            });
            if (!staff) {
                this.logger.log(
                    `Skipped deactivation for ${staff_id} (staff not found)`,
                );
                return;
            }
            email ??= staff.email;
            name ??= staff.name;
            role_id ??= staff.role?.id ?? null;
            role_name ??= staff.role?.name ?? null;
        }

        if (!performed_by_staff_name) {
            const actor = await this.prisma.staff.findUnique({
                where: { id: performed_by_staff_id },
                select: { name: true },
            });
            if (!actor) {
                this.logger.warn(
                    `Skipped deactivation for ${staff_id}; performing staff ${performed_by_staff_id} not found`,
                );
                return;
            }
            performed_by_staff_name = actor.name;
        }

        await this.revokeTokens(staff_id);

        await this.prisma.$transaction(async (tx) => {
            await tx.staffMarket.deleteMany({
                where: { staff_id },
            });

            await tx.staff.update({
                where: { id: staff_id },
                data: {
                    is_active: false,
                    role: { disconnect: true },
                },
            });

            await tx.staffAudit.create({
                data: {
                    action: StaffAuditAction.STAFF_DEACTIVATED,
                    staff_id,
                    staff_name: name,
                    performed_by_staff_id,
                    performed_by_staff_name,
                    role_id,
                    role_name,
                },
            });
        });

        this.logger.log(`Staff deactivated ${staff_id}`);

        await this.mailQueueService.enqueueSend({
            to: email,
            subject: 'Your staff account was deactivated',
            template: MAIL_TEMPLATES.STAFF_DEACTIVATED,
            context: {
                name,
                email,
            },
        });
    }

    private async revokeTokens(staffId: string): Promise<void> {
        const accessTokenCreatedAfter = new Date(
            Date.now() - STAFF_ACCESS_TOKEN_TTL_SECONDS * 1000,
        );

        const accessTokens = await this.prisma.staffToken.findMany({
            where: {
                staffId,
                type: TokenType.ACCESS,
                createdAt: { gte: accessTokenCreatedAfter },
            },
            select: { token: true, createdAt: true },
        });

        await Promise.all(
            accessTokens.map((token) =>
                this.blacklistAccessToken(token.token, token.createdAt),
            ),
        );

        const deletedRefresh = await this.prisma.staffToken.deleteMany({
            where: {
                staffId,
            },
        });

        this.logger.log(
            `Revoked tokens for staff ${staffId}: blacklisted ${accessTokens.length} access, deleted ${deletedRefresh.count} refresh`,
        );
    }

    private async blacklistAccessToken(
        token: string,
        createdAt: Date,
    ): Promise<void> {
        const expiresAtMs =
            createdAt.getTime() + STAFF_ACCESS_TOKEN_TTL_SECONDS * 1000;
        const remainingTtlSeconds = Math.max(
            0,
            Math.ceil((expiresAtMs - Date.now()) / 1000),
        );
        if (remainingTtlSeconds <= 0) {
            return;
        }

        await this.redisService.set(
            blacklistedTokenKey(token),
            '1',
            remainingTtlSeconds,
        );
    }
}
