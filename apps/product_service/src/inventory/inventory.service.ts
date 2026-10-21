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
import { WarehouseStatus } from '../../generated/prisma/client.js';
import { ProductRepository } from '../product/product.repository.js';
import { assertStaffHasMarkets } from '../shared/assert-staff-markets.js';
import { WarehouseRepository } from '../warehouse/warehouse.repository.js';
import type { CheckAvailabilityDto } from './dto/check-availability.dto.js';
import type { CreateInventoryDto } from './dto/create-inventory.dto.js';
import type { FindInventoryDto } from './dto/find-inventory.dto.js';
import type { ReserveInventoryDto } from './dto/reserve-inventory.dto.js';
import type { UpdateStockDto } from './dto/update-stock.dto.js';
import { InventoryRepository } from './inventory.repository.js';
import type { InventoryItem } from './types/inventory.type.js';

@Injectable()
export class InventoryService {
    private readonly logger = new Logger(InventoryService.name);

    constructor(
        private readonly inventoryRepository: InventoryRepository,
        private readonly productRepository: ProductRepository,
        private readonly warehouseRepository: WarehouseRepository,
    ) {}

    async create(
        data: CreateInventoryDto,
        staffMarketIds: string[],
    ): Promise<InventoryItem> {
        try {
            this.logger.log(
                `Creating inventory for market variant ${data.market_variant_id} in warehouse ${data.warehouse_id}`,
            );

            assertStaffHasMarkets(staffMarketIds, [data.market_id]);

            const marketVariant =
                await this.productRepository.findMarketVariantByIdOrThrow(
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

    async updateStock(
        data: UpdateStockDto,
        staffMarketIds: string[],
    ): Promise<{ available_quantity: number; sold_out: boolean }> {
        try {
            this.logger.log(
                `Updating stock for market variant ${data.market_variant_id} in warehouse ${data.warehouse_id}: ${data.type} ${data.quantity}`,
            );

            assertStaffHasMarkets(staffMarketIds, [data.market_id]);

            const marketVariant =
                await this.productRepository.findMarketVariantByIdOrThrow(
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
                `Stock updated to ${result.available_quantity} (sold_out=${result.sold_out})`,
            );
            return result;
        } catch (error) {
            this.handleError(error);
        }
    }

    async checkAvailability(data: CheckAvailabilityDto) {
        try {
            this.logger.log(
                `Checking availability for product ${data.product_id}`,
            );

            const availability =
                await this.inventoryRepository.findProductAvailability(
                    data.product_id,
                    data.market_id,
                );
            if (!availability) {
                throw new NotFoundException('Product not found');
            }

            return availability;
        } catch (error) {
            this.handleError(error);
        }
    }

    async reserve(data: ReserveInventoryDto) {
        try {
            this.logger.log(
                `Reserving inventory in warehouse ${data.warehouse_id}`,
            );

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
                    'Cannot reserve inventory in a closed warehouse',
                );
            }

            await this.inventoryRepository.reserveItems(
                data.market_id,
                data.warehouse_id,
                data.items,
            );
            this.logger.log(
                `Reserved inventory for ${data.items.length} item(s) in warehouse ${data.warehouse_id}`,
            );
            return { reserved: true };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findByVariant(variantId: string, query: FindInventoryDto) {
        try {
            this.logger.log(`Fetching inventory for variant ${variantId}`);
            const page = await this.inventoryRepository.findByVariantId(
                variantId,
                query,
            );
            return {
                items: page.items,
                next_cursor: page.next_cursor,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findByProduct(productId: string, query: FindInventoryDto) {
        try {
            this.logger.log(`Fetching inventory for product ${productId}`);
            const page = await this.inventoryRepository.findByProductId(
                productId,
                query,
            );
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
        staffMarketIds: string[],
    ) {
        try {
            this.logger.log(`Fetching inventory for warehouse ${warehouseId}`);
            assertStaffHasMarkets(staffMarketIds, [query.market_id]);
            const page = await this.inventoryRepository.findByWarehouseId(
                warehouseId,
                query,
            );
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
        staffMarketIds: string[],
    ) {
        try {
            this.logger.log(
                `Fetching inventory for market variant ${marketVariantId}`,
            );
            assertStaffHasMarkets(staffMarketIds, [query.market_id]);
            const page = await this.inventoryRepository.findByMarketVariantId(
                marketVariantId,
                query,
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

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                throw new NotFoundException('Inventory not found');
            }
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException(
                    'Inventory already exists for this warehouse and market variant',
                );
            }
            if (error.code === 'P2003') {
                throw new BadRequestException(
                    'Invalid warehouse or market variant reference',
                );
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
