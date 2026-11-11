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
import { Prisma, WarehouseStatus } from '@app/common';
import { CustomerService } from '../customer/customer.service.js';
import { ProductVariantRepository } from '../product/product-variant.repository.js';
import {
    ACCESS_CONTROL_ERROR,
    assertActorHasScopedAccess,
    type ScopedAccessActor,
} from '../shared/access-control.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import { resolveMarketId } from '../shared/resolve-market-id.js';
import { WarehouseRepository } from '../warehouse/warehouse.repository.js';
import type { CheckAvailabilityDto } from './dto/check-availability.dto.js';
import type { CreateInventoryDto } from './dto/create-inventory.dto.js';
import type { FindInventoryDto } from './dto/find-inventory.dto.js';
import type { ReserveInventoryDto } from './dto/reserve-inventory.dto.js';
import type { UpdateStockDto } from './dto/update-stock.dto.js';
import { InventoryRepository } from './inventory.repository.js';
import type {
    InventoryDetail,
    ReserveInventoryResult,
} from './types/inventory.type.js';

@Injectable()
export class InventoryService {
    private readonly logger = new Logger(InventoryService.name);

    constructor(
        private readonly inventoryRepository: InventoryRepository,
        private readonly productVariantRepository: ProductVariantRepository,
        private readonly warehouseRepository: WarehouseRepository,
        private readonly customerService: CustomerService,
    ) {}

    async create(
        data: CreateInventoryDto,
        actor: ScopedAccessActor,
    ): Promise<InventoryDetail> {
        try {
            this.logger.log(
                `Creating inventory for market variant ${data.market_variant_id} in warehouse ${data.warehouse_id}`,
            );

            assertActorHasScopedAccess(actor, {
                market_id: data.market_id,
                warehouse_id: data.warehouse_id,
            });

            const marketVariant =
                await this.productVariantRepository.findMarketVariantByIdOrThrow(
                    data.market_variant_id,
                );
            if (marketVariant.market_id !== data.market_id) {
                throw new BadRequestException(
                    'Market variant does not belong to the specified market',
                );
            }

            const warehouse = await this.warehouseRepository.findByIdOrThrow(
                data.warehouse_id,
            );
            if (warehouse.market_id !== data.market_id) {
                throw new BadRequestException(
                    'Warehouse does not belong to the specified market',
                );
            }
            if (warehouse.status === WarehouseStatus.CLOSED) {
                throw new BadRequestException(
                    'Cannot create inventory in a closed warehouse',
                );
            }

            const inventory = await this.inventoryRepository.create({
                market_variant_id: data.market_variant_id,
                warehouse_id: data.warehouse_id,
                available_quantity: data.available_quantity,
            });
            this.logger.log(`Inventory created ${inventory.id}`);
            return inventory;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(
        id: string,
        actor: ScopedAccessActor,
    ): Promise<InventoryDetail> {
        try {
            this.logger.log(`Fetching inventory ${id}`);
            const inventory = await this.inventoryRepository.findById(id);
            if (!inventory) {
                throw new NotFoundException('Inventory not found');
            }
            assertActorHasScopedAccess(actor, {
                market_id: inventory.warehouse.market_id,
                warehouse_id: inventory.warehouse_id,
            });
            this.logger.log(`Fetched inventory ${id}`);
            return inventory;
        } catch (error) {
            this.handleError(error);
        }
    }

    async updateStock(
        data: UpdateStockDto,
        actor: ScopedAccessActor,
    ): Promise<{ available_quantity: number }> {
        try {
            this.logger.log(
                `Updating stock for market variant ${data.market_variant_id} in warehouse ${data.warehouse_id}: ${data.type} ${data.quantity}`,
            );

            assertActorHasScopedAccess(actor, {
                market_id: data.market_id,
                warehouse_id: data.warehouse_id,
            });

            const marketVariant =
                await this.productVariantRepository.findMarketVariantByIdOrThrow(
                    data.market_variant_id,
                );
            if (marketVariant.market_id !== data.market_id) {
                throw new BadRequestException(
                    'Market variant does not belong to the specified market',
                );
            }

            const warehouse = await this.warehouseRepository.findByIdOrThrow(
                data.warehouse_id,
            );
            if (warehouse.market_id !== data.market_id) {
                throw new BadRequestException(
                    'Warehouse does not belong to the specified market',
                );
            }
            if (warehouse.status === WarehouseStatus.CLOSED) {
                throw new BadRequestException(
                    'Cannot update stock in a closed warehouse',
                );
            }

            const result = await this.inventoryRepository.updateStock(
                data.market_id,
                data.market_variant_id,
                data.warehouse_id,
                data.type,
                data.quantity,
            );
            this.logger.log(
                `Stock updated to ${result.available_quantity}`,
            );
            return result;
        } catch (error) {
            this.handleError(error);
        }
    }

    async checkAvailability(
        customerId: string | undefined,
        data: CheckAvailabilityDto,
    ) {
        try {
            this.logger.log(
                `Checking availability for product ${data.product_id}`,
            );

            const marketId = await resolveMarketId(
                this.customerService,
                customerId,
                data.market_id,
            );
            const availability =
                await this.inventoryRepository.findProductAvailability(
                    data.product_id,
                    marketId,
                );
            if (!availability) {
                throw new NotFoundException('Product not found');
            }

            return availability;
        } catch (error) {
            this.handleError(error);
        }
    }

    async reserve(
        data: ReserveInventoryDto & { expires_at?: Date },
        tx?: Prisma.TransactionClient,
    ) {
        try {
            const mergedItems = this.mergeReserveItems(data.items);
            const expiresAt =
                data.expires_at ?? new Date(Date.now() + 15 * 60 * 1000);

            this.logger.log(
                `Reserving inventory for ${mergedItems.length} item(s) in market ${data.market_id} at warehouse ${data.warehouse_id}`,
            );

            const result = await this.inventoryRepository.reserveItems(
                data.order_id,
                data.market_id,
                data.warehouse_id,
                mergedItems,
                expiresAt,
                tx,
            );
            this.logger.log(
                `Reserved inventory order ${result.order_id} at warehouse ${result.warehouse_id}`,
            );
            return this.toReserveResponse(result);
        } catch (error) {
            this.handleError(error);
        }
    }

    private mergeReserveItems(
        items: ReserveInventoryDto['items'],
    ): ReserveInventoryDto['items'] {
        return [
            ...items
                .reduce((byVariant, item) => {
                    const current = byVariant.get(item.market_variant_id);
                    if (current) {
                        current.quantity += item.quantity;
                    } else {
                        byVariant.set(item.market_variant_id, {
                            market_variant_id: item.market_variant_id,
                            quantity: item.quantity,
                        });
                    }
                    return byVariant;
                }, new Map<string, { market_variant_id: string; quantity: number }>())
                .values(),
        ];
    }

    private toReserveResponse(result: ReserveInventoryResult) {
        return {
            reserved: true,
            order_id: result.order_id,
            order_inventory_id: result.order_inventory_id,
            warehouse_id: result.warehouse_id,
            expires_at: result.expires_at.toISOString(),
            items: result.items,
        };
    }

    async findByVariant(
        customerId: string | undefined,
        variantId: string,
        query: FindInventoryDto,
    ) {
        try {
            this.logger.log(`Fetching inventory for variant ${variantId}`);
            const marketId = await resolveMarketId(
                this.customerService,
                customerId,
                query.market_id,
            );
            const page = await this.inventoryRepository.findByVariantId(
                variantId,
                { ...query, market_id: marketId },
            );
            this.logger.log(`Fetched inventory for variant ${variantId}`);
            return {
                items: page.items,
                next_cursor: page.next_cursor,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findByProduct(
        customerId: string | undefined,
        productId: string,
        query: FindInventoryDto,
    ) {
        try {
            this.logger.log(`Fetching inventory for product ${productId}`);
            const marketId = await resolveMarketId(
                this.customerService,
                customerId,
                query.market_id,
            );
            const page = await this.inventoryRepository.findByProductId(
                productId,
                { ...query, market_id: marketId },
            );
            this.logger.log(`Fetched inventory for product ${productId}`);
            return {
                items: page.items,
                next_cursor: page.next_cursor,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findByWarehouse(
        warehouseId: string,
        query: FindInventoryDto,
        actor: ScopedAccessActor,
    ) {
        try {
            this.logger.log(`Fetching inventory for warehouse ${warehouseId}`);
            if (!query.market_id) {
                throw new BadRequestException('market_id is required');
            }
            assertActorHasScopedAccess(actor, {
                market_id: query.market_id,
                warehouse_id: warehouseId,
            });
            const page = await this.inventoryRepository.findByWarehouseId(
                warehouseId,
                { ...query, market_id: query.market_id },
            );
            this.logger.log(`Fetched inventory for warehouse ${warehouseId}`);
            return {
                items: page.items,
                next_cursor: page.next_cursor,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findByMarketVariant(
        marketVariantId: string,
        query: FindInventoryDto,
        actor: ScopedAccessActor,
    ) {
        try {
            this.logger.log(
                `Fetching inventory for market variant ${marketVariantId}`,
            );
            if (!query.market_id) {
                throw new BadRequestException('market_id is required');
            }
            assertActorHasScopedAccess(actor, {
                market_id: query.market_id,
            });
            const page = await this.inventoryRepository.findByMarketVariantId(
                marketVariantId,
                { ...query, market_id: query.market_id },
            );
            this.logger.log(
                `Fetched inventory for market variant ${marketVariantId}`,
            );
            return {
                items: page.items,
                next_cursor: page.next_cursor,
            };
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
                throw this.inventoryConflict(error);
            }
            if (error.code === 'P2003' || error.code === 'P2025') {
                throw this.inventoryRelationNotFound(error);
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }

    private inventoryConflict(
        error: PrismaClientKnownRequestError,
    ): ConflictException {
        const target = Array.isArray(error.meta?.target)
            ? error.meta.target.join(',')
            : String(error.meta?.target ?? '');

        if (target.includes('order_id')) {
            return new ConflictException('INVENTORY_ALREADY_BOOKED');
        }
        if (
            target.includes('order_inventory_id') &&
            target.includes('market_variant_id')
        ) {
            return new ConflictException(
                'Line item already exists for this order inventory and market variant',
            );
        }
        return new ConflictException(
            'Inventory already exists for this warehouse and market variant',
        );
    }

    private inventoryRelationNotFound(
        error: PrismaClientKnownRequestError,
    ): NotFoundException {
        switch (prismaMissingRecordModel(error)) {
            case 'order':
                return new NotFoundException('Order not found');
            case 'orderinventory':
                return new NotFoundException('Order inventory not found');
            case 'inventorylineitem':
                return new NotFoundException('Inventory line item not found');
            case 'warehouse':
                return new NotFoundException('Warehouse not found');
            case 'marketvariant':
                return new NotFoundException('Market variant not found');
            case 'inventory':
                return new NotFoundException('Inventory not found');
            default:
                break;
        }

        if (prismaHintIncludes(error, 'order_inventory', 'orderinventory')) {
            return new NotFoundException('Order inventory not found');
        }
        if (prismaHintIncludes(error, 'inventory_line_item', 'inventorylineitem')) {
            return new NotFoundException('Inventory line item not found');
        }
        if (prismaHintIncludes(error, 'order')) {
            return new NotFoundException('Order not found');
        }
        if (prismaHintIncludes(error, 'warehouse')) {
            return new NotFoundException('Warehouse not found');
        }
        if (prismaHintIncludes(error, 'market_variant', 'marketvariant')) {
            return new NotFoundException('Market variant not found');
        }
        return new NotFoundException('Inventory not found');
    }
}
