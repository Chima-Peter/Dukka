import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import {
    Auth,
    CurrentStaff,
    Public,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
    type StaffJwtPayload,
} from '@app/common';
import { CheckAvailabilityDto } from './dto/check-availability.dto.js';
import { CreateInventoryDto } from './dto/create-inventory.dto.js';
import { FindInventoryDto } from './dto/find-inventory.dto.js';
import { ReserveInventoryDto } from './dto/reserve-inventory.dto.js';
import { UpdateStockDto } from './dto/update-stock.dto.js';
import { InventoryService } from './inventory.service.js';

@Auth('staff')
@Controller('inventory')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) {}

    @Post()
    @RequirePermission(StaffPermission.InventoryCreate)
    @ResponseMessage('Inventory created successfully')
    create(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: CreateInventoryDto,
    ) {
        return this.inventoryService.create(data, staff.market_ids);
    }

    @Patch('stock')
    @RequirePermission(StaffPermission.InventoryCreate)
    @ResponseMessage('Stock updated successfully')
    updateStock(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: UpdateStockDto,
    ) {
        return this.inventoryService.updateStock(data, staff.market_ids);
    }

    @Get('check-availability')
    @Public()
    @ResponseMessage('Inventory availability checked successfully')
    checkAvailability(@Query() query: CheckAvailabilityDto) {
        return this.inventoryService.checkAvailability(query);
    }

    @Post('reserve')
    @Auth('customer')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Inventory reserved successfully for 1 hour')
    reserve(@Body() data: ReserveInventoryDto) {
        return this.inventoryService.reserve(data);
    }

    @Get('warehouses/:warehouseId')
    @ResponseMessage('Warehouse inventory retrieved successfully')
    findByWarehouse(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
        @Query() query: FindInventoryDto,
    ) {
        return this.inventoryService.findByWarehouse(
            warehouseId,
            query,
            staff.market_ids,
        );
    }

    @Get('market-variants/:marketVariantId')
    @ResponseMessage('Market variant inventory retrieved successfully')
    findByMarketVariant(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('marketVariantId', ParseUUIDPipe) marketVariantId: string,
        @Query() query: FindInventoryDto,
    ) {
        return this.inventoryService.findByMarketVariant(
            marketVariantId,
            query,
            staff.market_ids,
        );
    }

    @Get('variants/:variantId')
    @Public()
    @ResponseMessage('Variant inventory retrieved successfully')
    findByVariant(
        @Param('variantId', ParseUUIDPipe) variantId: string,
        @Query() query: FindInventoryDto,
    ) {
        return this.inventoryService.findByVariant(variantId, query);
    }

    @Get('products/:productId')
    @Public()
    @ResponseMessage('Product inventory retrieved successfully')
    findByProduct(
        @Param('productId', ParseUUIDPipe) productId: string,
        @Query() query: FindInventoryDto,
    ) {
        return this.inventoryService.findByProduct(productId, query);
    }
}
