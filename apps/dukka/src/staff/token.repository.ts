import { Injectable } from '@nestjs/common';
import type { StaffToken, TokenType } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type CreateStaffTokenInput = {
    token: string;
    type: TokenType;
    staffId: string;
};

@Injectable()
export class StaffTokenRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateStaffTokenInput): Promise<StaffToken> {
        return this.prisma.staffToken.create({
            data: {
                token: data.token,
                type: data.type,
                staff: {
                    connect: { id: data.staffId },
                },
            },
        });
    }

    async findAllByStaffId(staffId: string): Promise<StaffToken[]> {
        return this.prisma.staffToken.findMany({ where: { staffId } });
    }

    async findByToken(
        staffId: string,
        token: string,
    ): Promise<StaffToken | null> {
        return this.prisma.staffToken.findFirst({ where: { staffId, token } });
    }

    async deleteByToken(staffId: string, token: string): Promise<number> {
        const result = await this.prisma.staffToken.deleteMany({
            where: { staffId, token },
        });

        return result.count;
    }

    async deleteAllByStaffId(staffId: string): Promise<StaffToken[]> {
        return this.prisma.$transaction(async (tx) => {
            const tokens = await tx.staffToken.findMany({ where: { staffId } });
            if (tokens.length === 0) {
                return [];
            }

            await tx.staffToken.deleteMany({ where: { staffId } });
            return tokens;
        });
    }
}
