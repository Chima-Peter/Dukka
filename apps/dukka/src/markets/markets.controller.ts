import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Ip,
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
import { CreateMarketDto } from './dto/create-market.dto.js';
import { FindMarketsDto } from './dto/find-markets.dto.js';
import { UpdateMarketDto } from './dto/update-market.dto.js';
import { ValidateMarketsDto } from './dto/validate-markets.dto.js';
import { MarketsService } from './markets.service.js';

@Auth('staff')
@Controller('markets')
export class MarketsController {
    constructor(private readonly marketsService: MarketsService) {}

    @Post()
    @RequirePermission(StaffPermission.MarketsProvision)
    @ResponseMessage('Market created successfully')
    create(@Body() data: CreateMarketDto) {
        return this.marketsService.create(data);
    }

    @Post('validate')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Market ids validated successfully')
    validate(@Body() data: ValidateMarketsDto) {
        return this.marketsService.validateIds(data);
    }

    @Get()
    @RequirePermission(StaffPermission.MarketsRead)
    @ResponseMessage('Markets retrieved successfully')
    findAll(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: FindMarketsDto,
    ) {
        return this.marketsService.findAll(staff.market_ids, query.status);
    }

    @Get('search')
    @Public()
    @ResponseMessage('Market retrieved successfully')
    search(@Ip() clientIp: string) {
        return this.marketsService.searchByIp(clientIp);
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
    @RequirePermission(StaffPermission.MarketsManage)
    @ResponseMessage('Market updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateMarketDto,
    ) {
        return this.marketsService.update(id, data);
    }

    @Post(':id/open')
    @RequirePermission(StaffPermission.MarketsManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Market opened successfully')
    open(@Param('id', ParseUUIDPipe) id: string) {
        return this.marketsService.open(id);
    }

    @Post(':id/close')
    @RequirePermission(StaffPermission.MarketsManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Market closed successfully')
    close(@Param('id', ParseUUIDPipe) id: string) {
        return this.marketsService.close(id);
    }

    @Delete(':id')
    @RequirePermission(StaffPermission.MarketsProvision)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Market deleted successfully')
    delete(@Param('id', ParseUUIDPipe) id: string) {
        return this.marketsService.delete(id);
    }
}
