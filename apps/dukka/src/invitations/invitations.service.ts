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
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { MAIL_TEMPLATES, MailQueueService } from '@app/queues';
import { ACCESS_CONTROL_ERROR } from '../shared/access-control.js';
import type { ConfigType } from '../config/env.interface.js';
import {
    STAFF_INVITATION_ACCEPT_PATH,
} from '../shared/invitation.constants.js';
import { PasswordHasher } from '../shared/password-hasher.service.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import type { AcceptStaffInvitationDto } from './dto/accept-staff-invitation.dto.js';
import type { FindStaffInvitationsDto } from './dto/find-staff-invitations.dto.js';
import type { InviteStaffDto } from './dto/invite-staff.dto.js';
import {
    INVITATION_REPO_ERROR,
    InvitationsRepository,
    type StaffInvitationDetails,
    type StaffInvitationPage,
} from './invitations.repository.js';

export type StaffInvitationResponse = Omit<StaffInvitationDetails, 'token'>;

@Injectable()
export class InvitationsService {
    private readonly logger = new Logger(InvitationsService.name);

    constructor(
        private readonly invitationsRepository: InvitationsRepository,
        private readonly passwordHasher: PasswordHasher,
        private readonly mailQueueService: MailQueueService,
        private readonly configService: ConfigService<ConfigType, true>,
    ) {}

    async invite(
        data: InviteStaffDto,
        invited_by_staff_id: string,
    ): Promise<StaffInvitationResponse> {
        try {
            this.logger.log(`Inviting staff ${data.email}`);
            const invitation = await this.invitationsRepository.create(
                data,
                invited_by_staff_id,
            );
            this.logger.log(`Staff invitation created ${invitation.id}`);

            await this.sendInvitationEmail(invitation);

            return this.toInvitationResponse(invitation);
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(
        query: FindStaffInvitationsDto,
        market_ids: string[],
        hierarchy: number | null,
    ): Promise<{
        items: StaffInvitationResponse[];
        next_cursor: string | null;
    }> {
        try {
            const page: StaffInvitationPage =
                await this.invitationsRepository.findAll(
                    query,
                    market_ids,
                    hierarchy,
                );
            return {
                items: page.items.map((item) =>
                    this.toInvitationResponse(item),
                ),
                next_cursor: page.next_cursor,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(
        id: string,
        market_ids: string[],
        hierarchy: number | null,
    ): Promise<StaffInvitationResponse> {
        try {
            const invitation =
                await this.invitationsRepository.findByIdInScope(
                    id,
                    market_ids,
                    hierarchy,
                );
            if (!invitation) {
                throw new NotFoundException('Invitation not found');
            }
            return this.toInvitationResponse(invitation);
        } catch (error) {
            this.handleError(error);
        }
    }

    async cancel(
        id: string,
        performed_by_staff_id: string,
    ): Promise<StaffInvitationResponse> {
        try {
            const invitation = await this.invitationsRepository.cancel(
                id,
                performed_by_staff_id,
            );
            return this.toInvitationResponse(invitation);
        } catch (error) {
            this.handleError(error);
        }
    }

    async resend(
        id: string,
        performed_by_staff_id: string,
    ): Promise<StaffInvitationResponse> {
        try {
            this.logger.log(`Resending staff invitation ${id}`);
            const invitation = await this.invitationsRepository.resend(
                id,
                performed_by_staff_id,
            );
            await this.sendInvitationEmail(invitation);
            return this.toInvitationResponse(invitation);
        } catch (error) {
            this.handleError(error);
        }
    }

    async accept(
        data: AcceptStaffInvitationDto,
    ): Promise<{ email: string; name: string }> {
        try {
            this.logger.log(`Accepting staff invitation for ${data.email}`);
            const password = await this.passwordHasher.hash(data.password);
            const invitation = await this.invitationsRepository.accept(
                data.email,
                data.token,
                password,
            );
            this.logger.log(
                `Staff invitation accepted ${invitation.id} → staff ${invitation.staff_id}`,
            );

            await this.mailQueueService.enqueueSend({
                to: invitation.email,
                subject: 'Your Dukka staff account',
                template: MAIL_TEMPLATES.STAFF_WELCOME,
                context: {
                    name: invitation.name,
                    email: invitation.email,
                    roleName: invitation.role.name,
                },
            });

            return {
                email: invitation.email,
                name: invitation.name,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    private async sendInvitationEmail(
        invitation: StaffInvitationDetails & { plain_token: string },
    ): Promise<void> {
        await this.mailQueueService.enqueueSend({
            to: invitation.email,
            subject: 'You are invited to join Dukka',
            template: MAIL_TEMPLATES.STAFF_INVITATION,
            context: {
                name: invitation.name,
                email: invitation.email,
                roleName: invitation.role.name,
                invitedByName: invitation.invited_by.name,
                inviteUrl: this.buildInviteAcceptUrl(invitation.plain_token),
            },
        });
    }

    private buildInviteAcceptUrl(token: string): string {
        const staffAppUrl = this.configService.getOrThrow('STAFF_APP_URL', {
            infer: true,
        });
        const base = staffAppUrl.replace(/\/$/, '');
        const url = new URL(`${base}${STAFF_INVITATION_ACCEPT_PATH}`);
        url.searchParams.set('token', token);
        return url.toString();
    }

    private toInvitationResponse(
        invitation: StaffInvitationDetails & { plain_token?: string },
    ): StaffInvitationResponse {
        const { token: _token, plain_token: _plainToken, ...rest } =
            invitation;
        void _token;
        void _plainToken;
        return rest;
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (error instanceof Error) {
            if (
                error.message ===
                INVITATION_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND
            ) {
                throw new NotFoundException('Performing staff not found');
            }
            if (error.message === INVITATION_REPO_ERROR.ROLE_NOT_FOUND) {
                throw new NotFoundException('Role not found');
            }
            if (error.message === INVITATION_REPO_ERROR.MARKETS_NOT_FOUND) {
                throw new NotFoundException('One or more markets not found');
            }
            if (
                error.message ===
                INVITATION_REPO_ERROR.INVITATION_ROLE_UNAVAILABLE
            ) {
                throw new BadRequestException(
                    'The role on this invitation is no longer available',
                );
            }
            if (
                error.message ===
                INVITATION_REPO_ERROR.INVITATION_MARKETS_UNAVAILABLE
            ) {
                throw new BadRequestException(
                    'One or more markets on this invitation are no longer available',
                );
            }
            if (error.message === INVITATION_REPO_ERROR.STAFF_EMAIL_EXISTS) {
                throw new ConflictException(
                    'A staff member with this email already exists',
                );
            }
            if (
                error.message === INVITATION_REPO_ERROR.PENDING_INVITATION_EXISTS
            ) {
                throw new ConflictException(
                    'A pending invitation already exists for this email',
                );
            }
            if (error.message === INVITATION_REPO_ERROR.INVITATION_NOT_FOUND) {
                throw new NotFoundException('Invitation not found');
            }
            if (
                error.message ===
                INVITATION_REPO_ERROR.INVITATION_ALREADY_ACCEPTED
            ) {
                throw new BadRequestException(
                    'Invitation has already been accepted',
                );
            }
            if (error.message === INVITATION_REPO_ERROR.INVITATION_CANCELLED) {
                throw new BadRequestException(
                    'Invitation has been cancelled',
                );
            }
            if (
                error.message === INVITATION_REPO_ERROR.INVITATION_NOT_PENDING
            ) {
                throw new BadRequestException(
                    'Invitation is no longer pending',
                );
            }
            if (error.message === INVITATION_REPO_ERROR.INVITATION_EXPIRED) {
                throw new BadRequestException('Invitation has expired');
            }
            if (
                error.message === INVITATION_REPO_ERROR.INVITATION_EMAIL_MISMATCH
            ) {
                throw new BadRequestException(
                    'Invitation email does not match',
                );
            }
            if (error.message === ACCESS_CONTROL_ERROR.INSUFFICIENT_HIERARCHY) {
                throw new ForbiddenException(
                    'Cannot invite someone with the same or higher hierarchy',
                );
            }
            if (
                error.message === ACCESS_CONTROL_ERROR.INSUFFICIENT_MARKET_ACCESS
            ) {
                throw new ForbiddenException(
                    'Cannot invite staff to markets outside your markets',
                );
            }
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                const target = error.meta?.target;
                const fields = Array.isArray(target)
                    ? target.map(String)
                    : [String(target ?? '')];
                if (fields.includes('email')) {
                    throw new ConflictException(
                        'A staff member with this email already exists',
                    );
                }
                throw new ConflictException(
                    'A pending invitation already exists for this email',
                );
            }
            if (error.code === 'P2003' || error.code === 'P2025') {
                this.logger.warn(
                    `Invitation relation error ${error.code}: ${error.message}`,
                );
                throw this.invitationRelationError(error);
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }

    private invitationRelationError(
        error: PrismaClientKnownRequestError,
    ): BadRequestException | NotFoundException {
        switch (prismaMissingRecordModel(error)) {
            case 'role':
                return new BadRequestException(
                    'The role on this invitation is no longer available',
                );
            case 'market':
                return new BadRequestException(
                    'One or more markets on this invitation are no longer available',
                );
            case 'staff':
                return new NotFoundException('Staff not found');
            default:
                if (prismaHintIncludes(error, 'role_id', 'role')) {
                    return new BadRequestException(
                        'The role on this invitation is no longer available',
                    );
                }
                if (prismaHintIncludes(error, 'market_id', 'market')) {
                    return new BadRequestException(
                        'One or more markets on this invitation are no longer available',
                    );
                }
                if (
                    error.code === 'P2003' ||
                    prismaHintIncludes(
                        error,
                        'nested connect',
                        'inline connect',
                    )
                ) {
                    return new BadRequestException('Role not found');
                }
                return new NotFoundException('Invitation not found');
        }
    }
}
