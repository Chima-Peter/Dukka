import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaService, StaffInvitationStatus } from '@app/common';
import type { ExpireStaffInvitationJobPayload } from '@app/queues';

type LockedInvitation = {
    id: string;
    status: StaffInvitationStatus;
};

@Injectable()
export class ExpireStaffInvitationService {
    private readonly logger = new Logger(ExpireStaffInvitationService.name);

    constructor(private readonly prisma: PrismaService) {}

    async process(payload: ExpireStaffInvitationJobPayload): Promise<void> {
        const ids = payload.invitation_ids;
        if (ids.length === 0) {
            this.logger.log('Skipped expire-staff-invitation (empty batch)');
            return;
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const locked = await tx.$queryRaw<LockedInvitation[]>`
                SELECT si.id, si.status
                FROM "StaffInvitation" si
                WHERE si.id IN (${Prisma.join(ids)})
                  AND si.status = ${StaffInvitationStatus.PENDING}::"StaffInvitationStatus"
                  AND si.expires_at <= NOW()
                FOR UPDATE OF si
            `;

            if (locked.length === 0) {
                return null;
            }

            const invitationIds = locked.map((invitation) => invitation.id);

            await tx.staffInvitation.updateMany({
                where: { id: { in: invitationIds } },
                data: { status: StaffInvitationStatus.EXPIRED },
            });

            return { invitation_count: invitationIds.length };
        });

        if (!result) {
            this.logger.log(
                `Skipped expire-staff-invitation batch of ${ids.length} (none eligible)`,
            );
            return;
        }

        this.logger.log(`Expired ${result.invitation_count} staff invitation(s)`);
    }
}
