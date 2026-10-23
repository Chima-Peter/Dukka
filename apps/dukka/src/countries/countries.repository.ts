import { Injectable } from '@nestjs/common';
import {
    CountryStatus,
    type Country,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateCountryDto } from './dto/create-country.dto.js';
import type { UpdateCountryDto } from './dto/update-country.dto.js';
import {
    countryWithMarket,
    type CountryWithMarket,
    type CountryWithMarketStatus,
} from './types/country.type.js';

@Injectable()
export class CountriesRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateCountryDto): Promise<CountryWithMarket> {
        return await this.prisma.country.create({
            data: {
                code: data.code,
                name: data.name,
            },
            include: countryWithMarket,
        });
    }

    async findAll(): Promise<CountryWithMarket[]> {
        return await this.prisma.country.findMany({
            where: { status: CountryStatus.OPEN },
            include: countryWithMarket,
            orderBy: { created_at: 'desc' },
        });
    }

    async findAllForStaff(
        status?: CountryStatus,
    ): Promise<CountryWithMarket[]> {
        return await this.prisma.country.findMany({
            where: {
                ...(status !== undefined && { status }),
            },
            include: countryWithMarket,
            orderBy: { created_at: 'desc' },
        });
    }

    async findById(id: string): Promise<CountryWithMarket | null> {
        return await this.prisma.country.findUnique({
            where: { id },
            include: countryWithMarket,
        });
    }

    async findWithMarketStatus(
        id: string,
    ): Promise<CountryWithMarketStatus | null> {
        return await this.prisma.country.findUnique({
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
        data: UpdateCountryDto,
    ): Promise<CountryWithMarket> {
        return await this.prisma.country.update({
            where: { id },
            data: {
                ...(data.code !== undefined && { code: data.code }),
                ...(data.name !== undefined && { name: data.name }),
            },
            include: countryWithMarket,
        });
    }

    async updateStatus(
        id: string,
        status: CountryStatus,
    ): Promise<CountryWithMarket> {
        return await this.prisma.country.update({
            where: { id },
            data: { status },
            include: countryWithMarket,
        });
    }

    async assignMarket(
        id: string,
        market_id: string,
    ): Promise<CountryWithMarket> {
        return await this.prisma.country.update({
            where: { id },
            data: {
                market: { connect: { id: market_id } },
            },
            include: countryWithMarket,
        });
    }

    async removeMarket(id: string): Promise<CountryWithMarket> {
        return await this.prisma.country.update({
            where: { id },
            data: {
                market: { disconnect: true },
            },
            include: countryWithMarket,
        });
    }

    async delete(id: string): Promise<Country> {
        return await this.prisma.country.delete({ where: { id } });
    }

    async countByMarketId(market_id: string): Promise<number> {
        return await this.prisma.country.count({
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
