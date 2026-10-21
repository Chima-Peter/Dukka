import {
    BadRequestException,
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import {
    InjectHttpClient,
    toHttpException,
    type HttpClient,
} from '@nestjs/http-client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { type ApiResponse } from '@app/common';
import {
    WarehouseStatus,
    type Warehouse,
} from '../../generated/prisma/client.js';
import { ACCOUNT_HTTP_CLIENT } from '../shared/account-http.constants.js';
import { assertStaffHasMarkets } from '../shared/assert-staff-markets.js';
import { WAREHOUSE_MANAGER_PERMISSIONS } from './constants/warehouse.constants.js';
import type { CreateWarehouseDto } from './dto/create-warehouse.dto.js';
import type { FindWarehousesDto } from './dto/find-warehouses.dto.js';
import type { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';
import type { UpdateWarehouseManagerDto } from './dto/update-warehouse-manager.dto.js';
import { WarehouseRepository } from './warehouse.repository.js';

@Injectable()
export class WarehouseService {
    private readonly logger = new Logger(WarehouseService.name);

    constructor(
        private readonly warehouseRepository: WarehouseRepository,
        @InjectHttpClient(ACCOUNT_HTTP_CLIENT)
        private readonly accountHttp: HttpClient,
    ) {}

    async create(
        data: CreateWarehouseDto,
        staffMarketIds: string[],
        accessToken?: string,
    ): Promise<Warehouse> {
        try {
            this.logger.log(
                `Creating warehouse ${data.name} in market ${data.market_id}`,
            );
            assertStaffHasMarkets(staffMarketIds, [data.market_id]);
            await this.assertMarketsValid([data.market_id], accessToken);
            await this.assertManagerValid(
                data.manager_id,
                data.market_id,
                accessToken,
            );
            const warehouse = await this.warehouseRepository.create(data);
            this.logger.log(`Warehouse created ${warehouse.id}`);
            return warehouse;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(query: FindWarehousesDto) {
        try {
            this.logger.log('Fetching warehouses');
            const page = await this.warehouseRepository.findAll(query);
            return {
                items: page.items,
                next_cursor: page.next_cursor,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(id: string): Promise<Warehouse> {
        try {
            this.logger.log(`Fetching warehouse ${id}`);
            return await this.warehouseRepository.findByIdOrThrow(id);
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(
        id: string,
        data: UpdateWarehouseDto,
        staffMarketIds: string[],
    ): Promise<Warehouse> {
        try {
            this.logger.log(`Updating warehouse ${id}`);
            const existing = await this.warehouseRepository.findByIdOrThrow(id);
            assertStaffHasMarkets(staffMarketIds, [existing.market_id]);
            if (existing.status === WarehouseStatus.CLOSED) {
                throw new BadRequestException(
                    'Cannot update a closed warehouse',
                );
            }
            const warehouse = await this.warehouseRepository.update(id, data);
            this.logger.log(`Warehouse updated ${id}`);
            return warehouse;
        } catch (error) {
            this.handleError(error);
        }
    }

    async updateManager(
        id: string,
        data: UpdateWarehouseManagerDto,
        staffMarketIds: string[],
        accessToken?: string,
    ): Promise<Warehouse> {
        try {
            this.logger.log(`Updating manager for warehouse ${id}`);
            const existing = await this.warehouseRepository.findByIdOrThrow(id);
            assertStaffHasMarkets(staffMarketIds, [existing.market_id]);
            if (existing.status === WarehouseStatus.CLOSED) {
                throw new BadRequestException(
                    'Cannot update manager of a closed warehouse',
                );
            }
            await this.assertManagerValid(
                data.manager_id,
                existing.market_id,
                accessToken,
            );
            const warehouse = await this.warehouseRepository.updateManager(
                id,
                data.manager_id,
            );
            this.logger.log(`Warehouse manager updated ${id}`);
            return warehouse;
        } catch (error) {
            this.handleError(error);
        }
    }

    async close(id: string, staffMarketIds: string[]): Promise<Warehouse> {
        try {
            this.logger.log(`Closing warehouse ${id}`);
            const existing = await this.warehouseRepository.findByIdOrThrow(id);
            assertStaffHasMarkets(staffMarketIds, [existing.market_id]);
            if (existing.status === WarehouseStatus.CLOSED) {
                throw new BadRequestException('Warehouse is already closed');
            }
            const warehouse = await this.warehouseRepository.close(id);
            this.logger.log(`Warehouse closed ${id}`);
            return warehouse;
        } catch (error) {
            this.handleError(error);
        }
    }

    private async assertMarketsValid(
        marketIds: string[],
        accessToken?: string,
    ): Promise<void> {
        if (!accessToken) {
            throw new UnauthorizedException('Missing authentication token');
        }

        try {
            const { data: body } = await this.accountHttp.post<
                ApiResponse<{
                    valid: boolean;
                    invalid_ids: string[];
                    inactive_ids: string[];
                }>
            >('/markets/validate', {
                json: { market_ids: marketIds },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            });

            if (!body.success || !body.data?.valid) {
                const invalidIds = body.data?.invalid_ids ?? [];
                const inactiveIds = body.data?.inactive_ids ?? [];
                const parts: string[] = [];
                if (invalidIds.length > 0) {
                    parts.push(`Invalid market id(s): ${invalidIds.join(', ')}`);
                }
                if (inactiveIds.length > 0) {
                    parts.push(
                        `Inactive market id(s): ${inactiveIds.join(', ')}`,
                    );
                }
                throw new BadRequestException({
                    message:
                        parts.length > 0
                            ? parts.join('; ')
                            : (body.message ??
                              'One or more market ids are invalid'),
                    invalid_ids: invalidIds,
                    inactive_ids: inactiveIds,
                });
            }
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw toHttpException(error, { forward: [400, 404] });
        }
    }

    private async assertManagerValid(
        managerId: string,
        marketId: string,
        accessToken?: string,
    ): Promise<void> {
        if (!accessToken) {
            throw new UnauthorizedException('Missing authentication token');
        }

        try {
            const { data: body } = await this.accountHttp.post<
                ApiResponse<{
                    valid: boolean;
                    invalid_ids: string[];
                    inactive_ids: string[];
                    missing_permission_ids: string[];
                    missing_market_ids: string[];
                }>
            >('/staff/validate', {
                json: {
                    staff_ids: [managerId],
                    permissions: [...WAREHOUSE_MANAGER_PERMISSIONS],
                    market_id: marketId,
                },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            });

            if (!body.success || !body.data?.valid) {
                const invalidIds = body.data?.invalid_ids ?? [];
                const inactiveIds = body.data?.inactive_ids ?? [];
                const missingPermissionIds =
                    body.data?.missing_permission_ids ?? [];
                const missingMarketIds = body.data?.missing_market_ids ?? [];
                const parts: string[] = [];
                if (invalidIds.length > 0) {
                    parts.push('Manager is not a valid staff member');
                }
                if (inactiveIds.length > 0) {
                    parts.push('Manager staff account is inactive');
                }
                if (missingPermissionIds.length > 0) {
                    parts.push(
                        'Manager lacks required warehouse permissions',
                    );
                }
                if (missingMarketIds.length > 0) {
                    parts.push(
                        'Manager is not assigned to the warehouse market',
                    );
                }
                throw new BadRequestException({
                    message:
                        parts.length > 0
                            ? parts.join('; ')
                            : (body.message ?? 'Manager is invalid'),
                    invalid_ids: invalidIds,
                    inactive_ids: inactiveIds,
                    missing_permission_ids: missingPermissionIds,
                    missing_market_ids: missingMarketIds,
                });
            }
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw toHttpException(error, { forward: [400, 404] });
        }
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                throw new NotFoundException('Warehouse not found');
            }
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException('Warehouse conflict');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
