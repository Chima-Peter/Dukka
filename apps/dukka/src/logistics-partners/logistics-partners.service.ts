import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { CreateLogisticsPartnerDto } from './dto/create-logistics-partner.dto.js';
import type { FindLogisticsPartnersDto } from './dto/find-logistics-partners.dto.js';
import type { UpdateLogisticsPartnerDto } from './dto/update-logistics-partner.dto.js';
import {
    ACCESS_CONTROL_ERROR,
    assertActorHasMarketOrGlobalScope,
    type ScopedAccessActor,
} from '../shared/access-control.js';
import { LogisticsPartnersRepository } from './logistics-partners.repository.js';
import type {
    LogisticsPartnerDetail,
    LogisticsPartnerPage,
    LogisticsPartnerRecord,
} from './types/logistics-partner.type.js';

@Injectable()
export class LogisticsPartnersService {
    private readonly logger = new Logger(LogisticsPartnersService.name);

    constructor(
        private readonly logisticsPartnersRepository: LogisticsPartnersRepository,
    ) {}

    async create(
        data: CreateLogisticsPartnerDto,
        actor: ScopedAccessActor,
    ): Promise<LogisticsPartnerRecord> {
        try {
            this.logger.log(`Creating logistics partner ${data.code}`);
            assertActorHasMarketOrGlobalScope(actor);
            const partner = await this.logisticsPartnersRepository.create(data);
            this.logger.log(`Logistics partner created ${partner.id}`);
            return partner;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(
        query: FindLogisticsPartnersDto,
    ): Promise<LogisticsPartnerPage> {
        try {
            this.logger.log('Fetching logistics partners');
            const page = await this.logisticsPartnersRepository.findAll(query);
            this.logger.log('Fetched logistics partners');
            return page;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(id: string): Promise<LogisticsPartnerDetail> {
        try {
            this.logger.log(`Fetching logistics partner ${id}`);
            const partner =
                await this.logisticsPartnersRepository.findDetailByIdOrThrow(
                    id,
                );
            this.logger.log(`Fetched logistics partner ${id}`);
            return partner;
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(
        id: string,
        data: UpdateLogisticsPartnerDto,
        actor: ScopedAccessActor,
    ): Promise<LogisticsPartnerRecord> {
        try {
            this.logger.log(`Updating logistics partner ${id}`);
            assertActorHasMarketOrGlobalScope(actor);
            const existing =
                await this.logisticsPartnersRepository.findByIdOrThrow(id);
            if (!existing.is_active) {
                throw new BadRequestException(
                    'Cannot update an inactive logistics partner',
                );
            }
            const partner = await this.logisticsPartnersRepository.update(
                id,
                data,
            );
            this.logger.log(`Logistics partner updated ${id}`);
            return partner;
        } catch (error) {
            this.handleError(error);
        }
    }

    async activate(
        id: string,
        actor: ScopedAccessActor,
    ): Promise<LogisticsPartnerRecord> {
        try {
            this.logger.log(`Activating logistics partner ${id}`);
            assertActorHasMarketOrGlobalScope(actor);
            const existing =
                await this.logisticsPartnersRepository.findByIdOrThrow(id);
            if (existing.is_active) {
                throw new BadRequestException(
                    'Logistics partner is already active',
                );
            }
            const partner = await this.logisticsPartnersRepository.setActive(
                id,
                true,
            );
            this.logger.log(`Logistics partner activated ${id}`);
            return partner;
        } catch (error) {
            this.handleError(error);
        }
    }

    async deactivate(
        id: string,
        actor: ScopedAccessActor,
    ): Promise<LogisticsPartnerRecord> {
        try {
            this.logger.log(`Deactivating logistics partner ${id}`);
            assertActorHasMarketOrGlobalScope(actor);
            const existing =
                await this.logisticsPartnersRepository.findByIdOrThrow(id);
            if (!existing.is_active) {
                throw new BadRequestException(
                    'Logistics partner is already inactive',
                );
            }
            const partner = await this.logisticsPartnersRepository.setActive(
                id,
                false,
            );
            this.logger.log(`Logistics partner deactivated ${id}`);
            return partner;
        } catch (error) {
            this.handleError(error);
        }
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (
            error instanceof Error &&
            (error.message === ACCESS_CONTROL_ERROR.INSUFFICIENT_MARKET_ACCESS ||
                error.message === ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS)
        ) {
            throw new ForbiddenException(
                'Cannot operate outside your assigned scope',
            );
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                const target = Array.isArray(error.meta?.target)
                    ? error.meta.target.join(',')
                    : String(error.meta?.target ?? '');

                if (target.includes('code')) {
                    throw new ConflictException(
                        'A logistics partner with this code already exists',
                    );
                }
                throw new ConflictException(
                    'A conflicting logistics partner record already exists',
                );
            }

            if (error.code === 'P2025') {
                throw new NotFoundException('Logistics partner not found');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
