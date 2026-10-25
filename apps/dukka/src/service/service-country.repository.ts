import { Injectable } from '@nestjs/common';
import { ServiceCountryStatus, type ServiceCountry, PrismaService } from '@app/common';
import type { CreateServiceCountryDto } from './dto/create-service-country.dto.js';
import type { UpdateServiceCountryDto } from './dto/update-service-country.dto.js';
import {
    serviceCountryWithMarket,
    type ServiceCountryWithMarket,
    type ServiceCountryWithMarketStatus,
} from './types/service-country.type.js';

@Injectable()
export class ServiceCountryRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateServiceCountryDto): Promise<ServiceCountryWithMarket> {
        return await this.prisma.serviceCountry.create({
            data: {
                code: data.code,
                name: data.name,
            },
            include: serviceCountryWithMarket,
        });
    }

    async findAll(): Promise<ServiceCountryWithMarket[]> {
        return await this.prisma.serviceCountry.findMany({
            where: {
                status: ServiceCountryStatus.OPEN,
            },
            include: serviceCountryWithMarket,
            orderBy: { created_at: 'desc' },
        });
    }

    async findAllForStaff(
        status?: ServiceCountryStatus,
    ): Promise<ServiceCountryWithMarket[]> {
        return await this.prisma.serviceCountry.findMany({
            where: {
                ...(status !== undefined && { status }),
            },
            include: serviceCountryWithMarket,
            orderBy: { created_at: 'desc' },
        });
    }

    async findById(id: string): Promise<ServiceCountryWithMarket | null> {
        return await this.prisma.serviceCountry.findUnique({
            where: { id },
            include: serviceCountryWithMarket,
        });
    }

    async findWithMarketStatus(
        id: string,
    ): Promise<ServiceCountryWithMarketStatus | null> {
        return await this.prisma.serviceCountry.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                market_id: true,
                market: {
                    select: { id: true, status: true },
                },
            },
        });
    }

    async update(
        id: string,
        data: UpdateServiceCountryDto,
    ): Promise<ServiceCountryWithMarket> {
        return await this.prisma.serviceCountry.update({
            where: { id },
            data: {
                ...(data.code !== undefined && { code: data.code }),
                ...(data.name !== undefined && { name: data.name }),
            },
            include: serviceCountryWithMarket,
        });
    }

    async updateStatus(
        id: string,
        status: ServiceCountryStatus,
    ): Promise<ServiceCountryWithMarket> {
        return await this.prisma.serviceCountry.update({
            where: { id },
            data: { status },
            include: serviceCountryWithMarket,
        });
    }

    async assignMarket(
        id: string,
        market_id: string,
    ): Promise<ServiceCountryWithMarket> {
        return await this.prisma.serviceCountry.update({
            where: { id },
            data: {
                market: { connect: { id: market_id } },
            },
            include: serviceCountryWithMarket,
        });
    }

    async removeMarket(id: string): Promise<ServiceCountryWithMarket> {
        return await this.prisma.serviceCountry.update({
            where: { id },
            data: {
                market: { disconnect: true },
            },
            include: serviceCountryWithMarket,
        });
    }

    async delete(id: string): Promise<ServiceCountry> {
        return await this.prisma.serviceCountry.delete({ where: { id } });
    }

    async countByMarketId(market_id: string): Promise<number> {
        return await this.prisma.serviceCountry.count({
            where: { market_id },
        });
    }

    async countServiceStates(country_id: string): Promise<number> {
        return await this.prisma.serviceState.count({
            where: { country_id },
        });
    }

    async countWarehouses(country_id: string): Promise<number> {
        return await this.prisma.warehouse.count({
            where: { country_id },
        });
    }
}
