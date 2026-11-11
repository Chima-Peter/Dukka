import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaService } from '@app/common';
import type { CreateLogisticsPartnerDto } from './dto/create-logistics-partner.dto.js';
import type { FindLogisticsPartnersDto } from './dto/find-logistics-partners.dto.js';
import type { UpdateLogisticsPartnerDto } from './dto/update-logistics-partner.dto.js';
import {
    logisticsPartnerDetailSelect,
    logisticsPartnerRecordSelect,
    logisticsPartnerSummarySelect,
    toLogisticsPartnerDetail,
    toLogisticsPartnerRecord,
    toLogisticsPartnerSummary,
} from './mappers/logistics-partner.mapper.js';
import type {
    LogisticsPartnerDetail,
    LogisticsPartnerPage,
    LogisticsPartnerRecord,
} from './types/logistics-partner.type.js';

@Injectable()
export class LogisticsPartnersRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(
        data: CreateLogisticsPartnerDto,
    ): Promise<LogisticsPartnerRecord> {
        const partner = await this.prisma.logisticsPartner.create({
            data: {
                name: data.name,
                partner_type: data.partner_type,
                contact_email: data.contact_email,
                contact_phone: data.contact_phone,
                code: data.code,
            },
            select: logisticsPartnerRecordSelect,
        });
        return toLogisticsPartnerRecord(partner);
    }

    async findAll(query: FindLogisticsPartnersDto): Promise<LogisticsPartnerPage> {
        const limit = query.limit ?? 50;
        const where: Prisma.LogisticsPartnerWhereInput = {
            ...(query.partner_type !== undefined && {
                partner_type: query.partner_type,
            }),
            ...(query.is_active !== undefined && {
                is_active: query.is_active,
            }),
            ...(query.name !== undefined && {
                name: {
                    contains: query.name,
                    mode: 'insensitive',
                },
            }),
            ...(query.code !== undefined && {
                code: {
                    contains: query.code,
                    mode: 'insensitive',
                },
            }),
        };

        const records = await this.prisma.logisticsPartner.findMany({
            where,
            select: logisticsPartnerSummarySelect,
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
        });

        const hasMore = records.length > limit;
        const sliced = hasMore ? records.slice(0, limit) : records;
        const items = sliced.map(toLogisticsPartnerSummary);

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1]!.id : null,
        };
    }

    async findById(id: string): Promise<LogisticsPartnerRecord | null> {
        const partner = await this.prisma.logisticsPartner.findUnique({
            where: { id },
            select: logisticsPartnerRecordSelect,
        });
        return partner ? toLogisticsPartnerRecord(partner) : null;
    }

    async findByIdOrThrow(id: string): Promise<LogisticsPartnerRecord> {
        const partner = await this.findById(id);
        if (!partner) {
            throw new NotFoundException('Logistics partner not found');
        }
        return partner;
    }

    async findDetailByIdOrThrow(id: string): Promise<LogisticsPartnerDetail> {
        const partner = await this.prisma.logisticsPartner.findUnique({
            where: { id },
            select: logisticsPartnerDetailSelect,
        });
        if (!partner) {
            throw new NotFoundException('Logistics partner not found');
        }
        return toLogisticsPartnerDetail(partner);
    }

    async update(
        id: string,
        data: UpdateLogisticsPartnerDto,
    ): Promise<LogisticsPartnerRecord> {
        const partner = await this.prisma.logisticsPartner.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.partner_type !== undefined && {
                    partner_type: data.partner_type,
                }),
                ...(data.contact_email !== undefined && {
                    contact_email: data.contact_email,
                }),
                ...(data.contact_phone !== undefined && {
                    contact_phone: data.contact_phone,
                }),
                ...(data.code !== undefined && { code: data.code }),
            },
            select: logisticsPartnerRecordSelect,
        });
        return toLogisticsPartnerRecord(partner);
    }

    async setActive(
        id: string,
        is_active: boolean,
    ): Promise<LogisticsPartnerRecord> {
        const partner = await this.prisma.logisticsPartner.update({
            where: { id },
            data: { is_active },
            select: logisticsPartnerRecordSelect,
        });
        return toLogisticsPartnerRecord(partner);
    }
}
