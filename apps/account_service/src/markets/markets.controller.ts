import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
} from '@nestjs/common';
import {
    Auth,
    CurrentStaff,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
    type StaffJwtPayload,
} from '@app/common';
import { CreateMarketDto } from './dto/create-market.dto.js';
import { UpdateMarketDto } from './dto/update-market.dto.js';
import { ValidateMarketsDto } from './dto/validate-markets.dto.js';
import { MarketsService } from './markets.service.js';

@Auth('staff')
@Controller('markets')
export class MarketsController {
    constructor(private readonly marketsService: MarketsService) {}

    @Post()
    @RequirePermission(StaffPermission.MarketsCreate)
    @ResponseMessage('Market created successfully')
    create(@Body() data: CreateMarketDto) {
        return this.marketsService.create(data);
    }

    @Post('validate')
    @ResponseMessage('Market ids validated successfully')
    validate(@Body() data: ValidateMarketsDto) {
        return this.marketsService.validateIds(data);
    }

    @Get()
    @RequirePermission(StaffPermission.MarketsRead)
    @ResponseMessage('Markets retrieved successfully')
    findAll(@CurrentStaff() staff: StaffJwtPayload) {
        return this.marketsService.findAll(staff.market_ids);
    }

    @Get(':id')
    @RequirePermission(StaffPermission.MarketsRead)
    @ResponseMessage('Market retrieved successfully')
    findOne(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.marketsService.findOne(id, staff.market_ids);
    }

    @Patch(':id')
    @RequirePermission(StaffPermission.MarketsUpdate)
    @ResponseMessage('Market updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateMarketDto,
    ) {
        return this.marketsService.update(id, data);
    }

    @Delete(':id')
    @RequirePermission(StaffPermission.MarketsDelete)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Market deleted successfully')
    delete(@Param('id', ParseUUIDPipe) id: string) {
        return this.marketsService.delete(id);
    }
}
