import { Injectable } from '@nestjs/common';
import { type Currency, PrismaService } from '@app/common';
import type { CreateCurrencyDto } from './dto/create-currency.dto.js';
import type { UpdateCurrencyDto } from './dto/update-currency.dto.js';

@Injectable()
export class CurrenciesRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateCurrencyDto): Promise<Currency> {
        return await this.prisma.currency.create({ data });
    }

    async findAll(): Promise<Currency[]> {
        return await this.prisma.currency.findMany({
            orderBy: { created_at: 'desc' },
        });
    }

    async findById(id: string): Promise<Currency | null> {
        return await this.prisma.currency.findUnique({ where: { id } });
    }

    async update(id: string, data: UpdateCurrencyDto): Promise<Currency> {
        return await this.prisma.currency.update({
            where: { id },
            data: {
                ...(data.code !== undefined && { code: data.code }),
                ...(data.name !== undefined && { name: data.name }),
                ...(data.is_active !== undefined && {
                    is_active: data.is_active,
                }),
            },
        });
    }

    async delete(id: string): Promise<Currency> {
        return await this.prisma.currency.delete({ where: { id } });
    }
}
