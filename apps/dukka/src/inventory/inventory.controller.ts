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
    CurrentCustomer,
    OptionalCustomerAuth,
    Public,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
    type CustomerJwtPayload,
    type StaffJwtPayload,
} from '@app/common';
import { toScopedAccessActor } from '../shared/access-control.js';
import { CheckAvailabilityDto } from './dto/check-availability.dto.js';
import { CreateInventoryDto } from './dto/create-inventory.dto.js';
import { FindInventoryDto } from './dto/find-inventory.dto.js';
import { UpdateStockDto } from './dto/update-stock.dto.js';
import { InventoryService } from './inventory.service.js';

@Auth('staff')
@Controller('inventory')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) {}

    @Post()
    @RequirePermission(StaffPermission.InventoryManage)
    @ResponseMessage('Inventory created successfully')
    create(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: CreateInventoryDto,
    ) {
        return this.inventoryService.create(data, toScopedAccessActor(staff));
    }

    @Patch('stock')
    @RequirePermission(StaffPermission.InventoryManage)
    @ResponseMessage('Stock updated successfully')
    updateStock(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: UpdateStockDto,
    ) {
        return this.inventoryService.updateStock(
            data,
            toScopedAccessActor(staff),
        );
    }

    @Get('check-availability')
    @Public()
    @OptionalCustomerAuth()
    @ResponseMessage('Inventory availability checked successfully')
    checkAvailability(
        @CurrentCustomer({ optional: true }) customer:
            | CustomerJwtPayload
            | undefined,
        @Query() query: CheckAvailabilityDto,
    ) {
        return this.inventoryService.checkAvailability(customer?.sub, query);
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
            toScopedAccessActor(staff),
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
            toScopedAccessActor(staff),
        );
    }

    @Get('variants/:variantId')
    @Public()
    @OptionalCustomerAuth()
    @ResponseMessage('Variant inventory retrieved successfully')
    findByVariant(
        @CurrentCustomer({ optional: true }) customer:
            | CustomerJwtPayload
            | undefined,
        @Param('variantId', ParseUUIDPipe) variantId: string,
        @Query() query: FindInventoryDto,
    ) {
        return this.inventoryService.findByVariant(
            customer?.sub,
            variantId,
            query,
        );
    }

    @Get('products/:productId')
    @Public()
    @OptionalCustomerAuth()
    @ResponseMessage('Product inventory retrieved successfully')
    findByProduct(
        @CurrentCustomer({ optional: true }) customer:
            | CustomerJwtPayload
            | undefined,
        @Param('productId', ParseUUIDPipe) productId: string,
        @Query() query: FindInventoryDto,
    ) {
        return this.inventoryService.findByProduct(
            customer?.sub,
            productId,
            query,
        );
    }
}
