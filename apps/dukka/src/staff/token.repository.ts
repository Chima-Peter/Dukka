import { Injectable } from '@nestjs/common';
import { type StaffToken, type TokenType, PrismaService } from '@app/common';

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

    async createMany(data: CreateStaffTokenInput[]): Promise<number> {
        const result = await this.prisma.staffToken.createMany({
            data: data.map((item) => ({
                token: item.token,
                type: item.type,
                staffId: item.staffId,
            })),
        });

        return result.count;
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

    async findRefreshToken(token: string): Promise<StaffToken | null> {
        return this.prisma.staffToken.findFirst({
            where: {
                token,
                type: 'REFRESH',
            },
        });
    }

    async deleteByToken(staffId: string, token: string): Promise<number> {
        const result = await this.prisma.staffToken.deleteMany({
            where: { staffId, token },
        });

        return result.count;
    }

    async deleteRefreshToken(staffId: string, token: string): Promise<number> {
        const result = await this.prisma.staffToken.deleteMany({
            where: {
                staffId,
                token,
                type: 'REFRESH',
            },
        });

        return result.count;
    }

    async deleteAllByStaffId(staffId: string): Promise<number> {
        const result = await this.prisma.staffToken.deleteMany({
            where: { staffId },
        });

        return result.count;
    }
}
