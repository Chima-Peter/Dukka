import { Module } from '@nestjs/common';
import { PasswordHasher } from '../shared/password-hasher.service.js';
import { StaffController } from './staff.controller.js';
import { StaffRepository } from './staff.repository.js';
import { StaffService } from './staff.service.js';

@Module({
    controllers: [StaffController],
    providers: [StaffService, StaffRepository, PasswordHasher],
    exports: [StaffService],
})
export class StaffModule {}
