import { Injectable } from '@nestjs/common';
import {
    StaffAuditAction,
    type Market,
    type Permission,
    type Prisma,
    type Qualification,
    type Role,
    type RoleMarket,
    type RolePermission,
    type Staff,
    type StaffProfile,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateQualificationDto } from './dto/create-qualification.dto.js';
import type { CreateStaffDto } from './dto/create-staff.dto.js';
import type { CreateStaffProfileDto } from './dto/create-staff-profile.dto.js';
import type { FindStaffDto } from './dto/find-staff.dto.js';
import type { UpdateQualificationDto } from './dto/update-qualification.dto.js';
import type { UpdateStaffDto } from './dto/update-staff.dto.js';
import type { UpdateStaffProfileDto } from './dto/update-staff-profile.dto.js';

export const STAFF_REPO_ERROR = {
    PERFORMING_STAFF_NOT_FOUND: 'PERFORMING_STAFF_NOT_FOUND',
    ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
    STAFF_NOT_FOUND: 'STAFF_NOT_FOUND',
} as const;

export type StaffRoleDetails = Role & {
    role_permissions: (RolePermission & { permission: Permission })[];
    role_markets: (RoleMarket & { market: Market })[];
};

export type StaffQualificationSummary = Omit<Qualification, 'document_url'>;

export type StaffWithDetails = Omit<Staff, 'password'> & {
    profile: StaffProfile | null;
    qualifications: StaffQualificationSummary[];
    role: StaffRoleDetails | null;
};

export type StaffPage = {
    items: StaffWithDetails[];
    next_cursor: string | null;
};

const staffQualificationSelect = {
    id: true,
    title: true,
    description: true,
    created_at: true,
    updated_at: true,
    staff_id: true,
} as const;

const staffDetailsInclude = {
    profile: true,
    qualifications: {
        orderBy: { created_at: 'desc' as const },
        select: staffQualificationSelect,
    },
    role: {
        include: {
            role_permissions: {
                include: { permission: true },
                orderBy: { created_at: 'desc' as const },
            },
            role_markets: {
                include: { market: true },
                orderBy: { created_at: 'desc' as const },
            },
        },
    },
};

@Injectable()
export class StaffRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(
        data: Omit<CreateStaffDto, 'password'> & { password: string },
        performed_by_staff_id: string,
    ): Promise<StaffWithDetails> {
        return await this.prisma.$transaction(async (tx) => {
            const actor = await tx.staff.findUnique({
                where: { id: performed_by_staff_id },
                select: { id: true, name: true },
            });
            if (!actor) {
                throw new Error(STAFF_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
            }

            const role = await tx.role.findUnique({
                where: { id: data.role_id },
                select: { id: true, name: true },
            });
            if (!role) {
                throw new Error(STAFF_REPO_ERROR.ROLE_NOT_FOUND);
            }

            const staff = await tx.staff.create({
                data: {
                    name: data.name,
                    email: data.email,
                    password: data.password,
                    role_id: data.role_id,
                    ...(data.phone_number !== undefined && {
                        phone_number: data.phone_number,
                    }),
                    ...(data.is_active !== undefined && {
                        is_active: data.is_active,
                    }),
                },
                include: staffDetailsInclude,
            });

            await tx.staffAudit.create({
                data: {
                    action: StaffAuditAction.STAFF_CREATED,
                    staff_id: staff.id,
                    staff_name: staff.name,
                    performed_by_staff_id: actor.id,
                    performed_by_staff_name: actor.name,
                    role_id: role.id,
                    role_name: role.name,
                },
            });

            return this.omitPassword(staff);
        });
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
        const roleFilters: Prisma.RoleWhereInput = {
            ...(query.market_id !== undefined && {
                role_markets: {
                    some: { market_id: query.market_id },
                },
            }),
            ...(query.permission_id !== undefined && {
                role_permissions: {
                    some: { permission_id: query.permission_id },
                },
            }),
        };

        return {
            ...(query.role_id !== undefined && { role_id: query.role_id }),
            ...(Object.keys(roleFilters).length > 0 && { role: roleFilters }),
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

    async update(
        id: string,
        data: UpdateStaffDto,
        performed_by_staff_id: string,
    ): Promise<StaffWithDetails> {
        return await this.prisma.$transaction(async (tx) => {
            const existing = await tx.staff.findUnique({
                where: { id },
                include: { role: { select: { id: true, name: true } } },
            });
            if (!existing) {
                throw new Error(STAFF_REPO_ERROR.STAFF_NOT_FOUND);
            }

            const roleChanging =
                data.role_id !== undefined && data.role_id !== existing.role_id;

            let newRole: { id: string; name: string } | null = null;
            if (roleChanging) {
                newRole = await tx.role.findUnique({
                    where: { id: data.role_id! },
                    select: { id: true, name: true },
                });
                if (!newRole) {
                    throw new Error(STAFF_REPO_ERROR.ROLE_NOT_FOUND);
                }
            }

            const actor =
                performed_by_staff_id === existing.id
                    ? { id: existing.id, name: existing.name }
                    : await tx.staff.findUnique({
                          where: { id: performed_by_staff_id },
                          select: { id: true, name: true },
                      });
            if (!actor) {
                throw new Error(STAFF_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
            }

            const staff = await tx.staff.update({
                where: { id },
                data: {
                    ...(data.name !== undefined && { name: data.name }),
                    ...(data.email !== undefined && { email: data.email }),
                    ...(data.role_id !== undefined && { role_id: data.role_id }),
                    ...(data.avatar_path !== undefined && {
                        avatar: data.avatar_path,
                    }),
                    ...(data.phone_number !== undefined && {
                        phone_number: data.phone_number,
                    }),
                    ...(data.is_active !== undefined && {
                        is_active: data.is_active,
                    }),
                },
                include: staffDetailsInclude,
            });

            if (roleChanging && newRole) {
                await tx.staffAudit.create({
                    data: {
                        action: existing.role
                            ? StaffAuditAction.ROLE_CHANGED
                            : StaffAuditAction.ROLE_ASSIGNED,
                        staff_id: staff.id,
                        staff_name: staff.name,
                        performed_by_staff_id: actor.id,
                        performed_by_staff_name: actor.name,
                        role_id: newRole.id,
                        role_name: newRole.name,
                        previous_role_id: existing.role?.id,
                        previous_role_name: existing.role?.name,
                    },
                });
            }

            return this.omitPassword(staff);
        });
    }

    async delete(
        id: string,
        performed_by_staff_id: string,
    ): Promise<{
        avatar: string | null;
        qualification_document_paths: string[];
    }> {
        return await this.prisma.$transaction(async (tx) => {
            const existing = await tx.staff.findUnique({
                where: { id },
                include: {
                    role: { select: { id: true, name: true } },
                    qualifications: {
                        select: { document_url: true },
                    },
                },
            });
            if (!existing) {
                throw new Error(STAFF_REPO_ERROR.STAFF_NOT_FOUND);
            }

            const actor =
                performed_by_staff_id === existing.id
                    ? { id: existing.id, name: existing.name }
                    : await tx.staff.findUnique({
                          where: { id: performed_by_staff_id },
                          select: { id: true, name: true },
                      });
            if (!actor) {
                throw new Error(STAFF_REPO_ERROR.PERFORMING_STAFF_NOT_FOUND);
            }

            const qualification_document_paths = existing.qualifications
                .map((qualification) => qualification.document_url)
                .filter((path): path is string => path !== null);

            await tx.qualification.deleteMany({
                where: { staff_id: id },
            });

            await tx.staff.update({
                where: { id },
                data: {
                    is_active: false,
                    role_id: null,
                    avatar: null,
                },
            });

            await tx.staffAudit.create({
                data: {
                    action: StaffAuditAction.STAFF_DELETED,
                    staff_id: existing.id,
                    staff_name: existing.name,
                    performed_by_staff_id: actor.id,
                    performed_by_staff_name: actor.name,
                    role_id: existing.role?.id,
                    role_name: existing.role?.name,
                },
            });

            return {
                avatar: existing.avatar,
                qualification_document_paths,
            };
        });
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
                ...(data.document_path !== undefined && {
                    document_url: data.document_path,
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
                ...(data.document_path !== undefined && {
                    document_url: data.document_path,
                }),
            },
        });
    }

    async deleteQualification(id: string): Promise<Qualification> {
        return await this.prisma.qualification.delete({ where: { id } });
    }

    private omitPassword(
        staff: Staff & {
            profile: StaffProfile | null;
            qualifications: StaffQualificationSummary[];
            role: StaffRoleDetails | null;
        },
    ): StaffWithDetails {
        const { password: _, ...rest } = staff;
        return rest;
    }
}
