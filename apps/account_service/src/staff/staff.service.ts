import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
    ALLOWED_AVATAR_CONTENT_TYPES,
    ALLOWED_QUALIFICATION_CONTENT_TYPES,
    AVATAR_BUCKET,
    MAX_AVATAR_BYTES,
    MAX_QUALIFICATION_BYTES,
    QUALIFICATIONS_BUCKET,
    SupabaseService,
} from '@app/common';
import type {
    Qualification,
    Staff,
    StaffProfile,
} from '../../generated/prisma/client.js';
import { PasswordHasher } from '../shared/password-hasher.service.js';
import type { CreateQualificationDto } from './dto/create-qualification.dto.js';
import type { CreateStaffDto } from './dto/create-staff.dto.js';
import type { CreateStaffProfileDto } from './dto/create-staff-profile.dto.js';
import type { FindStaffDto } from './dto/find-staff.dto.js';
import type { AssignRoleDto } from './dto/assign-role.dto.js';
import type { FindStaffAuditDto } from './dto/find-staff-audit.dto.js';
import type { UpdateQualificationDto } from './dto/update-qualification.dto.js';
import type { UpdateStaffDto } from './dto/update-staff.dto.js';
import type { UpdateStaffProfileDto } from './dto/update-staff-profile.dto.js';
import {
    STAFF_REPO_ERROR,
    StaffRepository,
    type StaffAuditPage,
    type StaffAuthRecord,
    type StaffWithDetails,
} from './staff.repository.js';

export type StaffResponse = Omit<StaffWithDetails, 'avatar'> & {
    /** Public Supabase URL built from the stored avatar path. */
    avatar: string | null;
};

export type QualificationResponse = Omit<Qualification, 'document_url'> & {
    document_url: string | null;
};

@Injectable()
export class StaffService {
    private readonly logger = new Logger(StaffService.name);

    constructor(
        private readonly staffRepository: StaffRepository,
        private readonly passwordHasher: PasswordHasher,
        private readonly supabaseService: SupabaseService,
    ) {}

    async create(
        data: CreateStaffDto,
        performed_by_staff_id: string,
    ): Promise<StaffResponse> {
        try {
            this.logger.log(`Creating staff ${data.email}`);
            const password = await this.passwordHasher.hash(data.password);
            const staff = await this.staffRepository.create(
                {
                    ...data,
                    password,
                },
                performed_by_staff_id,
            );
            this.logger.log(`Staff created ${staff.id}`);
            return this.toStaffResponse(staff);
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(query: FindStaffDto): Promise<{
        items: StaffResponse[];
        next_cursor: string | null;
    }> {
        try {
            this.logger.log('Fetching staff');
            const page = await this.staffRepository.findAll(query);
            return {
                items: page.items.map((item) => this.toStaffResponse(item)),
                next_cursor: page.next_cursor,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(id: string): Promise<StaffResponse> {
        try {
            this.logger.log(`Fetching staff ${id}`);
            const staff = await this.staffRepository.findById(id);
            if (!staff) {
                throw new NotFoundException('Staff not found');
            }
            return this.toStaffResponse(staff);
        } catch (error) {
            this.handleError(error);
        }
    }

    async findByEmail(email: string): Promise<StaffAuthRecord | null> {
        try {
            return await this.staffRepository.findByEmail(email);
        } catch {
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
        }
    }

    toPublicStaff(staff: StaffAuthRecord): StaffResponse {
        const { password: _, ...rest } = staff;
        return this.toStaffResponse(rest);
    }

    async updatePassword(email: string, password: string): Promise<Staff> {
        try {
            return await this.staffRepository.updatePassword(email, password);
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                throw new NotFoundException('Staff not found');
            }
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
        }
    }

    async changePassword(
        staff_id: string,
        current_password: string,
        new_password: string,
    ): Promise<void> {
        try {
            this.logger.log(`Changing password for staff ${staff_id}`);

            const staff =
                await this.staffRepository.findByIdWithPassword(staff_id);
            if (!staff) {
                throw new NotFoundException('Invalid user');
            }

            const isValid = await this.passwordHasher.verify(
                current_password,
                staff.password,
            );
            if (!isValid) {
                throw new UnauthorizedException('Invalid password');
            }

            const hashedPassword = await this.passwordHasher.hash(new_password);
            await this.updatePassword(staff.email, hashedPassword);

            this.logger.log(`Password updated for staff ${staff_id}`);
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAudits(
        staff_id: string,
        query: FindStaffAuditDto,
    ): Promise<StaffAuditPage> {
        try {
            this.logger.log(`Fetching audit logs for staff ${staff_id}`);
            await this.ensureStaffExists(staff_id);
            return await this.staffRepository.findAuditsByStaffId(
                staff_id,
                query,
            );
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(
        id: string,
        data: UpdateStaffDto,
    ): Promise<StaffResponse> {
        try {
            this.logger.log(`Updating staff ${id}`);

            const existing = await this.staffRepository.findById(id);
            if (!existing) {
                throw new NotFoundException('Staff not found');
            }

            if (data.avatar_path) {
                await this.assertValidAvatar(id, data.avatar_path);
            }

            const staff = await this.staffRepository.update(id, data);

            if (
                data.avatar_path &&
                existing.avatar &&
                existing.avatar !== data.avatar_path
            ) {
                await this.safeDeleteFiles([existing.avatar], AVATAR_BUCKET);
            }

            this.logger.log(`Staff updated ${id}`);
            return this.toStaffResponse(staff);
        } catch (error) {
            this.handleError(error);
        }
    }

    async assignRole(
        id: string,
        data: AssignRoleDto,
        performed_by_staff_id: string,
    ): Promise<StaffResponse> {
        try {
            this.logger.log(`Assigning role ${data.role_id} to staff ${id}`);
            const staff = await this.staffRepository.assignRole(
                id,
                data.role_id,
                performed_by_staff_id,
            );
            this.logger.log(`Role assigned to staff ${id}`);
            return this.toStaffResponse(staff);
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(
        id: string,
        performed_by_staff_id: string,
    ): Promise<object> {
        try {
            this.logger.log(`Deactivating staff ${id}`);
            const deleted = await this.staffRepository.delete(
                id,
                performed_by_staff_id,
            );

            if (deleted.avatar) {
                await this.safeDeleteFiles([deleted.avatar], AVATAR_BUCKET);
            }
            if (deleted.qualification_document_paths.length > 0) {
                await this.safeDeleteFiles(
                    deleted.qualification_document_paths,
                    QUALIFICATIONS_BUCKET,
                );
            }

            this.logger.log(`Staff deactivated ${id}`);
            return { data: null };
        } catch (error) {
            this.handleError(error);
        }
    }

    async getAvatarUploadURL(staff_id: string, name: string) {
        try {
            this.logger.log(`Generating avatar upload URL for staff ${staff_id}`);
            await this.ensureStaffExists(staff_id);
            const data = await this.supabaseService.createSignedUploadUrl(
                staff_id,
                name,
                AVATAR_BUCKET,
            );
            return { data };
        } catch (error) {
            this.handleError(error);
        }
    }

    async getQualificationUploadURL(staff_id: string, name: string) {
        try {
            this.logger.log(
                `Generating qualification upload URL for staff ${staff_id}`,
            );
            await this.ensureStaffExists(staff_id);
            const data = await this.supabaseService.createSignedUploadUrl(
                staff_id,
                name,
                QUALIFICATIONS_BUCKET,
            );
            return { data };
        } catch (error) {
            this.handleQualificationError(error);
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
    ): Promise<QualificationResponse> {
        try {
            this.logger.log(`Creating qualification for staff ${staff_id}`);
            await this.ensureStaffExists(staff_id);

            if (data.document_path) {
                await this.assertValidQualificationDocument(
                    staff_id,
                    data.document_path,
                );
            }

            const qualification =
                await this.staffRepository.createQualification(staff_id, data);
            this.logger.log(
                `Qualification created ${qualification.id} for staff ${staff_id}`,
            );
            return await this.toQualificationResponse(qualification);
        } catch (error) {
            this.handleQualificationError(error);
        }
    }

    async findQualifications(
        staff_id: string,
    ): Promise<QualificationResponse[]> {
        try {
            this.logger.log(`Fetching qualifications for staff ${staff_id}`);
            await this.ensureStaffExists(staff_id);
            const qualifications =
                await this.staffRepository.findQualificationsByStaffId(
                    staff_id,
                );
            return await Promise.all(
                qualifications.map((item) =>
                    this.toQualificationResponse(item),
                ),
            );
        } catch (error) {
            this.handleQualificationError(error);
        }
    }

    async updateQualification(
        staff_id: string,
        qualification_id: string,
        data: UpdateQualificationDto,
    ): Promise<QualificationResponse> {
        try {
            this.logger.log(
                `Updating qualification ${qualification_id} for staff ${staff_id}`,
            );
            const existing = await this.ensureQualificationBelongsToStaff(
                staff_id,
                qualification_id,
            );

            if (data.document_path) {
                await this.assertValidQualificationDocument(
                    staff_id,
                    data.document_path,
                );
            }

            const qualification =
                await this.staffRepository.updateQualification(
                    qualification_id,
                    data,
                );

            if (
                data.document_path &&
                existing.document_url &&
                existing.document_url !== data.document_path
            ) {
                await this.safeDeleteFiles(
                    [existing.document_url],
                    QUALIFICATIONS_BUCKET,
                );
            }

            this.logger.log(`Qualification updated ${qualification_id}`);
            return await this.toQualificationResponse(qualification);
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
            const existing = await this.ensureQualificationBelongsToStaff(
                staff_id,
                qualification_id,
            );
            await this.staffRepository.deleteQualification(qualification_id);

            if (existing.document_url) {
                await this.safeDeleteFiles(
                    [existing.document_url],
                    QUALIFICATIONS_BUCKET,
                );
            }

            this.logger.log(`Qualification deleted ${qualification_id}`);
            return { data: null };
        } catch (error) {
            this.handleQualificationError(error);
        }
    }

    private toStaffResponse(staff: StaffWithDetails): StaffResponse {
        const { avatar: avatar_path, ...rest } = staff;
        return {
            ...rest,
            avatar: avatar_path
                ? this.supabaseService.getPublicURL(avatar_path, AVATAR_BUCKET)
                : null,
        };
    }

    private async toQualificationResponse(
        qualification: Qualification,
    ): Promise<QualificationResponse> {
        const { document_url: document_path, ...rest } = qualification;
        let document_url: string | null = null;
        if (document_path) {
            document_url = await this.supabaseService.createSignedDownloadUrl(
                document_path,
                QUALIFICATIONS_BUCKET,
            );
        }
        return {
            ...rest,
            document_url,
        };
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
    ): Promise<Qualification> {
        await this.ensureStaffExists(staff_id);
        const qualification =
            await this.staffRepository.findQualificationById(qualification_id);
        if (!qualification || qualification.staff_id !== staff_id) {
            throw new NotFoundException('Qualification not found');
        }
        return qualification;
    }

    private async assertValidAvatar(
        staff_id: string,
        avatar_path: string,
    ): Promise<void> {
        if (!avatar_path.startsWith(`${staff_id}/`)) {
            this.logger.warn(
                `Avatar path does not belong to staff ${staff_id}`,
            );
            throw new BadRequestException('Invalid avatar filepath');
        }

        const objectInfo = await this.supabaseService.getObjectInfo(
            avatar_path,
            AVATAR_BUCKET,
        );
        if (!objectInfo) {
            this.logger.warn(`Avatar not found at ${avatar_path}`);
            throw new BadRequestException('Invalid avatar filepath');
        }

        if (objectInfo.size <= 0) {
            this.logger.warn(`Avatar at ${avatar_path} is empty`);
            await this.supabaseService.deleteFile([avatar_path], AVATAR_BUCKET);
            throw new BadRequestException('Avatar file is empty');
        }

        if (objectInfo.size > MAX_AVATAR_BYTES) {
            this.logger.warn(
                `Avatar at ${avatar_path} exceeds size limit (${objectInfo.size} bytes)`,
            );
            await this.supabaseService.deleteFile([avatar_path], AVATAR_BUCKET);
            throw new BadRequestException(
                `Avatar must be ${MAX_AVATAR_BYTES / (1024 * 1024)}MB or smaller`,
            );
        }

        const contentType = objectInfo.contentType.toLowerCase();
        if (!ALLOWED_AVATAR_CONTENT_TYPES.has(contentType)) {
            this.logger.warn(
                `Avatar at ${avatar_path} has invalid content type ${objectInfo.contentType}`,
            );
            await this.supabaseService.deleteFile([avatar_path], AVATAR_BUCKET);
            throw new BadRequestException(
                'Avatar must be a JPEG, PNG, or WebP image',
            );
        }
    }

    private async assertValidQualificationDocument(
        staff_id: string,
        document_path: string,
    ): Promise<void> {
        if (!document_path.startsWith(`${staff_id}/`)) {
            this.logger.warn(
                `Qualification document path does not belong to staff ${staff_id}`,
            );
            throw new BadRequestException('Invalid qualification document path');
        }

        const objectInfo = await this.supabaseService.getObjectInfo(
            document_path,
            QUALIFICATIONS_BUCKET,
        );
        if (!objectInfo) {
            this.logger.warn(
                `Qualification document not found at ${document_path}`,
            );
            throw new BadRequestException('Invalid qualification document path');
        }

        if (objectInfo.size <= 0) {
            this.logger.warn(
                `Qualification document at ${document_path} is empty`,
            );
            await this.supabaseService.deleteFile(
                [document_path],
                QUALIFICATIONS_BUCKET,
            );
            throw new BadRequestException('Qualification document is empty');
        }

        if (objectInfo.size > MAX_QUALIFICATION_BYTES) {
            this.logger.warn(
                `Qualification document at ${document_path} exceeds size limit (${objectInfo.size} bytes)`,
            );
            await this.supabaseService.deleteFile(
                [document_path],
                QUALIFICATIONS_BUCKET,
            );
            throw new BadRequestException(
                `Qualification document must be ${MAX_QUALIFICATION_BYTES / (1024 * 1024)}MB or smaller`,
            );
        }

        const contentType = objectInfo.contentType.toLowerCase();
        if (!ALLOWED_QUALIFICATION_CONTENT_TYPES.has(contentType)) {
            this.logger.warn(
                `Qualification document at ${document_path} has invalid content type ${objectInfo.contentType}`,
            );
            await this.supabaseService.deleteFile(
                [document_path],
                QUALIFICATIONS_BUCKET,
            );
            throw new BadRequestException(
                'Qualification document must be a PDF',
            );
        }
    }

    private async safeDeleteFiles(
        paths: string[],
        bucket: string,
    ): Promise<void> {
        try {
            await this.supabaseService.deleteFile(paths, bucket);
        } catch (error) {
            this.logger.warn(
                `Failed to delete storage object(s) ${paths.join(',')}: ${error}`,
            );
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

        if (error instanceof Error) {
            if (error.message === STAFF_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND) {
                throw new NotFoundException('Performing staff not found');
            }
            if (error.message === STAFF_REPO_ERROR.ROLE_NOT_FOUND) {
                throw new NotFoundException('Role not found');
            }
            if (error.message === STAFF_REPO_ERROR.SELF_ROLE_ASSIGNMENT) {
                throw new ForbiddenException(
                    'Staff cannot assign a role to themselves',
                );
            }
            if (error.message === STAFF_REPO_ERROR.SELF_DELETION) {
                throw new ForbiddenException(
                    'Staff cannot deactivate themselves',
                );
            }
            if (error.message === STAFF_REPO_ERROR.STAFF_NOT_FOUND) {
                throw new NotFoundException('Staff not found');
            }
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
                throw new ConflictException('Invalid role reference');
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
