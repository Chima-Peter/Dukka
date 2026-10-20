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
import {
    InventoryRepository,
    type InventoryDetail,
} from './inventory.repository.js';

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
    ): Promise<InventoryDetail> {
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

            const marketVariantIds = [
                ...new Set(data.items.map((item) => item.market_variant_id)),
            ];
            const marketVariants =
                await this.productRepository.findMarketVariantsByIds(
                    marketVariantIds,
                );
            const marketVariantsById = new Map(
                marketVariants.map((marketVariant) => [
                    marketVariant.id,
                    marketVariant,
                ]),
            );

            const missingIds = marketVariantIds.filter(
                (id) => !marketVariantsById.has(id),
            );
            if (missingIds.length > 0) {
                throw new NotFoundException(
                    `Market variant(s) not found: ${missingIds.join(', ')}`,
                );
            }

            const wrongMarketIds = marketVariantIds.filter(
                (id) => marketVariantsById.get(id)?.market_id !== data.market_id,
            );
            if (wrongMarketIds.length > 0) {
                throw new BadRequestException(
                    `Market variant(s) do not belong to the specified market: ${wrongMarketIds.join(', ')}`,
                );
            }

            const reserved = await this.inventoryRepository.reserveItems(
                data.warehouse_id,
                data.items,
            );
            this.logger.log(
                `Reserved inventory for ${reserved.length} market variant(s) in warehouse ${data.warehouse_id}`,
            );
            return reserved;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findByVariant(
        variantId: string,
        query: FindInventoryDto,
    ): Promise<{
        variant_id: string;
        market_id: string;
        available_quantity: number;
        reserved_quantity: number;
        items: InventoryDetail[];
    }> {
        try {
            this.logger.log(`Fetching inventory for variant ${variantId}`);

            await this.productRepository.findVariantByIdOrThrow(variantId);

            const items = await this.inventoryRepository.findByVariantId(
                variantId,
                query.market_id,
            );

            return {
                variant_id: variantId,
                market_id: query.market_id,
                available_quantity: items.reduce(
                    (sum, row) => sum + row.available_quantity,
                    0,
                ),
                reserved_quantity: items.reduce(
                    (sum, row) => sum + row.reserved_quantity,
                    0,
                ),
                items,
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findByProduct(
        productId: string,
        query: FindInventoryDto,
    ): Promise<{
        product_id: string;
        market_id: string;
        available_quantity: number;
        reserved_quantity: number;
        items: InventoryDetail[];
    }> {
        try {
            this.logger.log(`Fetching inventory for product ${productId}`);

            await this.productRepository.findByIdOrThrow(productId);

            const items = await this.inventoryRepository.findByProductId(
                productId,
                query.market_id,
            );

            return {
                product_id: productId,
                market_id: query.market_id,
                available_quantity: items.reduce(
                    (sum, row) => sum + row.available_quantity,
                    0,
                ),
                reserved_quantity: items.reduce(
                    (sum, row) => sum + row.reserved_quantity,
                    0,
                ),
                items,
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
