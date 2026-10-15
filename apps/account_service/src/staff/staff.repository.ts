import { Injectable } from '@nestjs/common';
import type {
    Prisma,
    Qualification,
    Staff,
    StaffProfile,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateQualificationDto } from './dto/create-qualification.dto.js';
import type { CreateStaffDto } from './dto/create-staff.dto.js';
import type { CreateStaffProfileDto } from './dto/create-staff-profile.dto.js';
import type { FindStaffDto } from './dto/find-staff.dto.js';
import type { UpdateQualificationDto } from './dto/update-qualification.dto.js';
import type { UpdateStaffDto } from './dto/update-staff.dto.js';
import type { UpdateStaffProfileDto } from './dto/update-staff-profile.dto.js';

export type StaffWithDetails = Omit<Staff, 'password'> & {
    profile: StaffProfile | null;
    qualifications: Qualification[];
};

export type StaffPage = {
    items: StaffWithDetails[];
    next_cursor: string | null;
};

const staffDetailsInclude = {
    profile: true,
    qualifications: {
        orderBy: { created_at: 'desc' as const },
    },
};

@Injectable()
export class StaffRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(
        data: Omit<CreateStaffDto, 'password'> & { password: string },
    ): Promise<StaffWithDetails> {
        const staff = await this.prisma.staff.create({
            data: {
                name: data.name,
                email: data.email,
                password: data.password,
                role_id: data.role_id,
                ...(data.avatar !== undefined && { avatar: data.avatar }),
                ...(data.phone_number !== undefined && {
                    phone_number: data.phone_number,
                }),
                ...(data.is_active !== undefined && {
                    is_active: data.is_active,
                }),
            },
            include: staffDetailsInclude,
        });

        return this.omitPassword(staff);
    }

    async findAll(query: FindStaffDto): Promise<StaffPage> {
        const limit = query.limit ?? 20;
        const where = this.buildFindWhere(query);

        const records = await this.prisma.staff.findMany({
            where,
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
            include: staffDetailsInclude,
        });

        const hasMore = records.length > limit;
        const page = hasMore ? records.slice(0, limit) : records;
        const items = page.map((item) => this.omitPassword(item));

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1].id : null,
        };
    }

    private buildFindWhere(query: FindStaffDto): Prisma.StaffWhereInput {
        return {
            ...(query.role_id !== undefined && { role_id: query.role_id }),
            ...(query.market_id !== undefined && {
                market_assignments: {
                    some: { market_id: query.market_id },
                },
            }),
            ...(query.permission_id !== undefined && {
                role: {
                    role_permissions: {
                        some: { permission_id: query.permission_id },
                    },
                },
            }),
        };
    }

    async findById(id: string): Promise<StaffWithDetails | null> {
        const staff = await this.prisma.staff.findUnique({
            where: { id },
            include: staffDetailsInclude,
        });

        return staff ? this.omitPassword(staff) : null;
    }

    async exists(id: string): Promise<boolean> {
        const staff = await this.prisma.staff.findUnique({
            where: { id },
            select: { id: true },
        });
        return staff !== null;
    }

    async update(id: string, data: UpdateStaffDto): Promise<StaffWithDetails> {
        const staff = await this.prisma.staff.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.email !== undefined && { email: data.email }),
                ...(data.role_id !== undefined && { role_id: data.role_id }),
                ...(data.avatar !== undefined && { avatar: data.avatar }),
                ...(data.phone_number !== undefined && {
                    phone_number: data.phone_number,
                }),
                ...(data.is_active !== undefined && {
                    is_active: data.is_active,
                }),
            },
            include: staffDetailsInclude,
        });

        return this.omitPassword(staff);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.staff.delete({ where: { id } });
    }

    async createProfile(
        staff_id: string,
        data: CreateStaffProfileDto,
    ): Promise<StaffProfile> {
        return await this.prisma.staffProfile.create({
            data: {
                staff_id,
                ...(data.job_title !== undefined && {
                    job_title: data.job_title,
                }),
                ...(data.bio !== undefined && { bio: data.bio }),
                ...(data.date_of_birth !== undefined && {
                    date_of_birth: new Date(data.date_of_birth),
                }),
                ...(data.gender !== undefined && { gender: data.gender }),
                ...(data.address !== undefined && { address: data.address }),
                ...(data.hire_date !== undefined && {
                    hire_date: new Date(data.hire_date),
                }),
            },
        });
    }

    async findProfileByStaffId(
        staff_id: string,
    ): Promise<StaffProfile | null> {
        return await this.prisma.staffProfile.findUnique({
            where: { staff_id },
        });
    }

    async updateProfile(
        staff_id: string,
        data: UpdateStaffProfileDto,
    ): Promise<StaffProfile> {
        return await this.prisma.staffProfile.update({
            where: { staff_id },
            data: {
                ...(data.job_title !== undefined && {
                    job_title: data.job_title,
                }),
                ...(data.bio !== undefined && { bio: data.bio }),
                ...(data.date_of_birth !== undefined && {
                    date_of_birth: new Date(data.date_of_birth),
                }),
                ...(data.gender !== undefined && { gender: data.gender }),
                ...(data.address !== undefined && { address: data.address }),
                ...(data.hire_date !== undefined && {
                    hire_date: new Date(data.hire_date),
                }),
            },
        });
    }

    async deleteProfile(staff_id: string): Promise<void> {
        await this.prisma.staffProfile.delete({ where: { staff_id } });
    }

    async createQualification(
        staff_id: string,
        data: CreateQualificationDto,
    ): Promise<Qualification> {
        return await this.prisma.qualification.create({
            data: {
                staff_id,
                title: data.title,
                ...(data.description !== undefined && {
                    description: data.description,
                }),
                ...(data.document_url !== undefined && {
                    document_url: data.document_url,
                }),
            },
        });
    }

    async findQualificationsByStaffId(
        staff_id: string,
    ): Promise<Qualification[]> {
        return await this.prisma.qualification.findMany({
            where: { staff_id },
            orderBy: { created_at: 'desc' },
        });
    }

    async findQualificationById(
        id: string,
    ): Promise<Qualification | null> {
        return await this.prisma.qualification.findUnique({ where: { id } });
    }

    async updateQualification(
        id: string,
        data: UpdateQualificationDto,
    ): Promise<Qualification> {
        return await this.prisma.qualification.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && {
                    description: data.description,
                }),
                ...(data.document_url !== undefined && {
                    document_url: data.document_url,
                }),
            },
        });
    }

    async deleteQualification(id: string): Promise<void> {
        await this.prisma.qualification.delete({ where: { id } });
    }

    private omitPassword(
        staff: Staff & {
            profile: StaffProfile | null;
            qualifications: Qualification[];
        },
    ): StaffWithDetails {
        const { password: _, ...rest } = staff;
        return rest;
    }
}
