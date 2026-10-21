import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { Prisma, type Category } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { FindCategoriesDto } from './dto/find-categories.dto.js';

@Injectable()
export class CategoryRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(name: string): Promise<Category> {
        return await this.prisma.category.create({
            data: { name },
        });
    }

    async findAll(query: FindCategoriesDto): Promise<Category[]> {
        const where: Prisma.CategoryWhereInput = {
            ...(query.name !== undefined && {
                name: {
                    contains: query.name,
                    mode: 'insensitive',
                },
            }),
        };

        return await this.prisma.category.findMany({
            where,
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
        });
    }

    async findById(id: string): Promise<Category | null> {
        return await this.prisma.category.findUnique({
            where: { id },
        });
    }

    async update(id: string, name: string): Promise<Category> {
        return await this.prisma.category.update({
            where: { id },
            data: { name },
        });
    }

    async delete(id: string): Promise<Category> {
        try {
            return await this.prisma.category.delete({
                where: { id },
            });
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2003'
            ) {
                throw new ConflictException(
                    'Cannot delete a category that has products',
                );
            }
            throw error;
        }
    }
}
