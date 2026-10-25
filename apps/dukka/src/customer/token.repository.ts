import { Injectable } from '@nestjs/common';
import { type Token, type TokenType, PrismaService } from '@app/common';

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

    async createMany(data: CreateTokenInput[]): Promise<number> {
        const result = await this.prisma.token.createMany({
            data: data.map((item) => ({
                token: item.token,
                type: item.type,
                customerId: item.customerId,
            })),
        });

        return result.count;
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

    async findRefreshToken(token: string): Promise<Token | null> {
        return this.prisma.token.findFirst({
            where: {
                token,
                type: 'REFRESH',
            },
        });
    }

    async deleteByToken(customerId: string, token: string): Promise<number> {
        const result = await this.prisma.token.deleteMany({
            where: { customerId, token },
        });

        return result.count;
    }

    async deleteRefreshToken(
        customerId: string,
        token: string,
    ): Promise<number> {
        const result = await this.prisma.token.deleteMany({
            where: {
                customerId,
                token,
                type: 'REFRESH',
            },
        });

        return result.count;
    }

    async deleteAllByCustomerId(customerId: string): Promise<number> {
        const result = await this.prisma.token.deleteMany({
            where: { customerId },
        });

        return result.count;
    }
}
