import { Module } from '@nestjs/common';
import { PasswordHasher } from '../shared/password-hasher.service.js';
import {
    InvitationsController,
} from './invitations.controller.js';
import { InvitationsRepository } from './invitations.repository.js';
import { InvitationsService } from './invitations.service.js';

@Module({
    controllers: [InvitationsController],
    providers: [InvitationsService, InvitationsRepository, PasswordHasher],
    exports: [InvitationsService],
})
export class InvitationsModule {}
