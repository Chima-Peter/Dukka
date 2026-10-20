import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
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

    @Post('check-availability')
    @Public()
    @ResponseMessage('Inventory availability checked successfully')
    checkAvailability(@Body() data: CheckAvailabilityDto) {
        return this.inventoryService.checkAvailability(data);
    }

    @Post('reserve')
    @Auth('customer')
    @ResponseMessage('Inventory reserved successfully')
    reserve(@Body() data: ReserveInventoryDto) {
        return this.inventoryService.reserve(data);
    }

    @Get('variants/:variantId')
    @ResponseMessage('Variant inventory retrieved successfully')
    findByVariant(
        @Param('variantId', ParseUUIDPipe) variantId: string,
        @Query() query: FindInventoryDto,
    ) {
        return this.inventoryService.findByVariant(variantId, query);
    }

    @Get('products/:productId')
    @ResponseMessage('Product inventory retrieved successfully')
    findByProduct(
        @Param('productId', ParseUUIDPipe) productId: string,
        @Query() query: FindInventoryDto,
    ) {
        return this.inventoryService.findByProduct(productId, query);
    }
}
