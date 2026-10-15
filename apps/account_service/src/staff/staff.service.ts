import {
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { Qualification, StaffProfile } from '../../generated/prisma/client.js';
import { PasswordHasher } from '../shared/password-hasher.service.js';
import type { CreateQualificationDto } from './dto/create-qualification.dto.js';
import type { CreateStaffDto } from './dto/create-staff.dto.js';
import type { CreateStaffProfileDto } from './dto/create-staff-profile.dto.js';
import type { FindStaffDto } from './dto/find-staff.dto.js';
import type { UpdateQualificationDto } from './dto/update-qualification.dto.js';
import type { UpdateStaffDto } from './dto/update-staff.dto.js';
import type { UpdateStaffProfileDto } from './dto/update-staff-profile.dto.js';
import {
    StaffRepository,
    type StaffPage,
    type StaffWithDetails,
} from './staff.repository.js';

@Injectable()
export class StaffService {
    private readonly logger = new Logger(StaffService.name);

    constructor(
        private readonly staffRepository: StaffRepository,
        private readonly passwordHasher: PasswordHasher,
    ) {}

    async create(data: CreateStaffDto): Promise<StaffWithDetails> {
        try {
            this.logger.log(`Creating staff ${data.email}`);
            const password = await this.passwordHasher.hash(data.password);
            const staff = await this.staffRepository.create({
                ...data,
                password,
            });
            this.logger.log(`Staff created ${staff.id}`);
            return staff;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(query: FindStaffDto): Promise<StaffPage> {
        try {
            this.logger.log('Fetching staff');
            return await this.staffRepository.findAll(query);
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(id: string): Promise<StaffWithDetails> {
        try {
            this.logger.log(`Fetching staff ${id}`);
            const staff = await this.staffRepository.findById(id);
            if (!staff) {
                throw new NotFoundException('Staff not found');
            }
            return staff;
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(id: string, data: UpdateStaffDto): Promise<StaffWithDetails> {
        try {
            this.logger.log(`Updating staff ${id}`);
            const staff = await this.staffRepository.update(id, data);
            this.logger.log(`Staff updated ${id}`);
            return staff;
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(id: string): Promise<object> {
        try {
            this.logger.log(`Deleting staff ${id}`);
            await this.staffRepository.delete(id);
            this.logger.log(`Staff deleted ${id}`);
            return { data: null };
        } catch (error) {
            this.handleError(error);
        }
    }

    async createProfile(
        staff_id: string,
        data: CreateStaffProfileDto,
    ): Promise<StaffProfile> {
        try {
            this.logger.log(`Creating profile for staff ${staff_id}`);
            await this.ensureStaffExists(staff_id);
            const profile = await this.staffRepository.createProfile(
                staff_id,
                data,
            );
            this.logger.log(`Profile created for staff ${staff_id}`);
            return profile;
        } catch (error) {
            this.handleProfileError(error);
        }
    }

    async findProfile(staff_id: string): Promise<StaffProfile> {
        try {
            this.logger.log(`Fetching profile for staff ${staff_id}`);
            await this.ensureStaffExists(staff_id);
            const profile =
                await this.staffRepository.findProfileByStaffId(staff_id);
            if (!profile) {
                throw new NotFoundException('Staff profile not found');
            }
            return profile;
        } catch (error) {
            this.handleProfileError(error);
        }
    }

    async updateProfile(
        staff_id: string,
        data: UpdateStaffProfileDto,
    ): Promise<StaffProfile> {
        try {
            this.logger.log(`Updating profile for staff ${staff_id}`);
            await this.ensureStaffExists(staff_id);
            const profile = await this.staffRepository.updateProfile(
                staff_id,
                data,
            );
            this.logger.log(`Profile updated for staff ${staff_id}`);
            return profile;
        } catch (error) {
            this.handleProfileError(error);
        }
    }

    async deleteProfile(staff_id: string): Promise<object> {
        try {
            this.logger.log(`Deleting profile for staff ${staff_id}`);
            await this.ensureStaffExists(staff_id);
            await this.staffRepository.deleteProfile(staff_id);
            this.logger.log(`Profile deleted for staff ${staff_id}`);
            return { data: null };
        } catch (error) {
            this.handleProfileError(error);
        }
    }

    async createQualification(
        staff_id: string,
        data: CreateQualificationDto,
    ): Promise<Qualification> {
        try {
            this.logger.log(`Creating qualification for staff ${staff_id}`);
            await this.ensureStaffExists(staff_id);
            const qualification =
                await this.staffRepository.createQualification(staff_id, data);
            this.logger.log(
                `Qualification created ${qualification.id} for staff ${staff_id}`,
            );
            return qualification;
        } catch (error) {
            this.handleQualificationError(error);
        }
    }

    async findQualifications(staff_id: string): Promise<Qualification[]> {
        try {
            this.logger.log(`Fetching qualifications for staff ${staff_id}`);
            await this.ensureStaffExists(staff_id);
            return await this.staffRepository.findQualificationsByStaffId(
                staff_id,
            );
        } catch (error) {
            this.handleQualificationError(error);
        }
    }

    async updateQualification(
        staff_id: string,
        qualification_id: string,
        data: UpdateQualificationDto,
    ): Promise<Qualification> {
        try {
            this.logger.log(
                `Updating qualification ${qualification_id} for staff ${staff_id}`,
            );
            await this.ensureQualificationBelongsToStaff(
                staff_id,
                qualification_id,
            );
            const qualification =
                await this.staffRepository.updateQualification(
                    qualification_id,
                    data,
                );
            this.logger.log(`Qualification updated ${qualification_id}`);
            return qualification;
        } catch (error) {
            this.handleQualificationError(error);
        }
    }

    async deleteQualification(
        staff_id: string,
        qualification_id: string,
    ): Promise<object> {
        try {
            this.logger.log(
                `Deleting qualification ${qualification_id} for staff ${staff_id}`,
            );
            await this.ensureQualificationBelongsToStaff(
                staff_id,
                qualification_id,
            );
            await this.staffRepository.deleteQualification(qualification_id);
            this.logger.log(`Qualification deleted ${qualification_id}`);
            return { data: null };
        } catch (error) {
            this.handleQualificationError(error);
        }
    }

    private async ensureStaffExists(staff_id: string): Promise<void> {
        const exists = await this.staffRepository.exists(staff_id);
        if (!exists) {
            throw new NotFoundException('Staff not found');
        }
    }

    private async ensureQualificationBelongsToStaff(
        staff_id: string,
        qualification_id: string,
    ): Promise<void> {
        await this.ensureStaffExists(staff_id);
        const qualification =
            await this.staffRepository.findQualificationById(qualification_id);
        if (!qualification || qualification.staff_id !== staff_id) {
            throw new NotFoundException('Qualification not found');
        }
    }

    private handleProfileError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException(
                    'Staff profile already exists for this staff member',
                );
            }
            if (error.code === 'P2003') {
                this.logger.warn(`Foreign key constraint: ${error.message}`);
                throw new NotFoundException('Staff not found');
            }
            if (error.code === 'P2025') {
                throw new NotFoundException('Staff profile not found');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }

    private handleQualificationError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2003') {
                this.logger.warn(`Foreign key constraint: ${error.message}`);
                throw new NotFoundException('Staff not found');
            }
            if (error.code === 'P2025') {
                throw new NotFoundException('Qualification not found');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException(
                    'A staff member with this email already exists',
                );
            }
            if (error.code === 'P2003') {
                this.logger.warn(`Foreign key constraint: ${error.message}`);
                throw new ConflictException(
                    'Invalid role reference, or staff cannot be deleted while related audit records exist',
                );
            }
            if (error.code === 'P2025') {
                throw new NotFoundException('Staff not found');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
