import { Injectable } from '@nestjs/common';
import type { Token, TokenType } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type CreateTokenInput = {
    token: string;
    type: TokenType;
    customerId: string;
};

@Injectable()
export class TokenRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateTokenInput): Promise<Token> {
        return this.prisma.token.create({
            data: {
                token: data.token,
                type: data.type,
                customer: {
                    connect: { id: data.customerId },
                },
            },
        });
    }

    async findAllByCustomerId(customerId: string): Promise<Token[]> {
        return this.prisma.token.findMany({ where: { customerId } });
    }

    async findByToken(
        customerId: string,
        token: string,
    ): Promise<Token | null> {
        return this.prisma.token.findFirst({ where: { customerId, token } });
    }

    async deleteByToken(customerId: string, token: string): Promise<number> {
        const result = await this.prisma.token.deleteMany({
            where: { customerId, token },
        });

        return result.count;
    }

    async deleteAllByCustomerId(customerId: string): Promise<Token[]> {
        return this.prisma.$transaction(async (tx) => {
            const tokens = await tx.token.findMany({ where: { customerId } });
            if (tokens.length === 0) {
                return [];
            }

            await tx.token.deleteMany({ where: { customerId } });
            return tokens;
        });
    }
}
