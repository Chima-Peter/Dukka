import {
    BadRequestException,
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
    WarehouseStatus,
    type Warehouse,
} from '../../generated/prisma/client.js';
import { MarketsService } from '../markets/markets.service.js';
import { assertStaffHasMarkets } from '../shared/assert-staff-markets.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import type { AssignWarehouseServiceStateDto } from './dto/assign-warehouse-service-state.dto.js';
import type { CreateServiceStateDto } from './dto/create-service-state.dto.js';
import type { FindServiceStatesDto } from './dto/find-service-states.dto.js';
import type { UpdateServiceStateDto } from './dto/update-service-state.dto.js';
import { ServiceStateRepository } from './service-state.repository.js';
import type {
    ServiceStateItem,
    WarehouseServiceStateItem,
} from './types/service-state.type.js';
import { WarehouseRepository } from './warehouse.repository.js';

@Injectable()
export class ServiceStateService {
    private readonly logger = new Logger(ServiceStateService.name);

    constructor(
        private readonly serviceStateRepository: ServiceStateRepository,
        private readonly warehouseRepository: WarehouseRepository,
        private readonly marketsService: MarketsService,
    ) {}

    async create(
        data: CreateServiceStateDto,
        staffMarketIds: string[],
    ): Promise<ServiceStateItem> {
        try {
            this.logger.log(
                `Creating service state ${data.state_name} in market ${data.market_id}`,
            );
            assertStaffHasMarkets(staffMarketIds, [data.market_id]);
            await this.assertMarketsValid([data.market_id]);
            const serviceState = await this.serviceStateRepository.create(
                data.market_id,
                data.state_name,
            );
            this.logger.log(`Service state created ${serviceState.id}`);
            return serviceState;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(query: FindServiceStatesDto) {
        try {
            this.logger.log(
                `Fetching service states for market ${query.market_id}`,
            );
            const page = await this.serviceStateRepository.findAll(query);
            return {
                items: page.items,
                next_cursor: page.next_cursor,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findWarehouseCoveringState(serviceStateId: string): Promise<Warehouse> {
        try {
            this.logger.log(
                `Fetching warehouse covering service state ${serviceStateId}`,
            );
            const warehouse =
                await this.serviceStateRepository.findWarehouseCoveringState(
                    serviceStateId,
                );
            if (!warehouse) {
                throw new NotFoundException(
                    'No open warehouse covers this state',
                );
            }
            return warehouse;
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(
        id: string,
        data: UpdateServiceStateDto,
        staffMarketIds: string[],
    ): Promise<ServiceStateItem> {
        try {
            this.logger.log(`Updating service state ${id}`);
            assertStaffHasMarkets(staffMarketIds, [data.market_id]);
            const serviceState = await this.serviceStateRepository.update(
                id,
                data.market_id,
                data.state_name,
            );
            this.logger.log(`Service state updated ${id}`);
            return serviceState;
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(
        id: string,
        marketId: string,
        staffMarketIds: string[],
    ): Promise<ServiceStateItem> {
        try {
            this.logger.log(`Deleting service state ${id}`);
            assertStaffHasMarkets(staffMarketIds, [marketId]);
            const serviceState = await this.serviceStateRepository.delete(
                id,
                marketId,
            );
            this.logger.log(`Service state deleted ${id}`);
            return serviceState;
        } catch (error) {
            this.handleError(error);
        }
    }

    async assignWarehouse(
        id: string,
        data: AssignWarehouseServiceStateDto,
        staffMarketIds: string[],
    ): Promise<WarehouseServiceStateItem> {
        try {
            this.logger.log(
                `Assigning warehouse ${data.warehouse_id} to service state ${id}`,
            );
            const serviceState =
                await this.serviceStateRepository.findByIdOrThrow(id);
            assertStaffHasMarkets(staffMarketIds, [serviceState.market_id]);

            const warehouse = await this.warehouseRepository.findByIdOrThrow(
                data.warehouse_id,
            );
            if (warehouse.market_id !== serviceState.market_id) {
                throw new BadRequestException(
                    'Warehouse does not belong to the same market as the service state',
                );
            }
            if (warehouse.status === WarehouseStatus.CLOSED) {
                throw new BadRequestException(
                    'Cannot assign a closed warehouse to a service state',
                );
            }

            const link = await this.serviceStateRepository.assignWarehouse(
                id,
                data.warehouse_id,
            );
            this.logger.log(
                `Warehouse ${data.warehouse_id} assigned to service state ${id}`,
            );
            return link;
        } catch (error) {
            this.handleError(error);
        }
    }

    async unassignWarehouse(
        id: string,
        warehouseId: string,
        staffMarketIds: string[],
    ): Promise<WarehouseServiceStateItem> {
        try {
            this.logger.log(
                `Unassigning warehouse ${warehouseId} from service state ${id}`,
            );
            const serviceState =
                await this.serviceStateRepository.findByIdOrThrow(id);
            assertStaffHasMarkets(staffMarketIds, [serviceState.market_id]);
            const link = await this.serviceStateRepository.unassignWarehouse(
                id,
                warehouseId,
            );
            this.logger.log(
                `Warehouse ${warehouseId} unassigned from service state ${id}`,
            );
            return link;
        } catch (error) {
            this.handleError(error);
        }
    }

    private async assertMarketsValid(marketIds: string[]): Promise<void> {
        const result = await this.marketsService.validateIds({
            market_ids: marketIds,
        });
        if (!result.valid) {
            const parts: string[] = [];
            if (result.invalid_ids.length > 0) {
                parts.push(
                    `Invalid market id(s): ${result.invalid_ids.join(', ')}`,
                );
            }
            if (result.inactive_ids.length > 0) {
                parts.push(
                    `Inactive market id(s): ${result.inactive_ids.join(', ')}`,
                );
            }
            throw new BadRequestException({
                message:
                    parts.length > 0
                        ? parts.join('; ')
                        : 'One or more market ids are invalid',
                invalid_ids: result.invalid_ids,
                inactive_ids: result.inactive_ids,
            });
        }
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException(
                    'Service state already exists for this market or warehouse link already exists',
                );
            }
            if (error.code === 'P2003' || error.code === 'P2025') {
                this.logger.warn(
                    `Service state relation error ${error.code}: ${error.message}`,
                );
                throw this.relationNotFound(error);
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }

    private relationNotFound(
        error: PrismaClientKnownRequestError,
    ): NotFoundException {
        switch (prismaMissingRecordModel(error)) {
            case 'market':
                return new NotFoundException('Market not found');
            case 'warehouse':
                return new NotFoundException('Warehouse not found');
            case 'servicestate':
                return new NotFoundException('Service state not found');
            case 'warehouseservicestate':
                return new NotFoundException(
                    'Warehouse is not assigned to this service state',
                );
            default:
                break;
        }

        if (prismaHintIncludes(error, 'market_id', "'market'")) {
            return new NotFoundException('Market not found');
        }
        if (prismaHintIncludes(error, 'warehouse')) {
            return new NotFoundException('Warehouse not found');
        }
        if (prismaHintIncludes(error, 'service_state')) {
            return new NotFoundException('Service state not found');
        }
        return new NotFoundException('Service state not found');
    }
}
