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
import { ResponseMessage } from '@app/common';
import { CreateMarketDto } from './dto/create-market.dto.js';
import { UpdateMarketDto } from './dto/update-market.dto.js';
import { MarketsService } from './markets.service.js';

@Controller('markets')
export class MarketsController {
    constructor(private readonly marketsService: MarketsService) {}

    @Post()
    @ResponseMessage('Market created successfully')
    create(@Body() data: CreateMarketDto) {
        return this.marketsService.create(data);
    }

    @Get()
    @ResponseMessage('Markets retrieved successfully')
    findAll() {
        return this.marketsService.findAll();
    }

    @Get(':id')
    @ResponseMessage('Market retrieved successfully')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.marketsService.findOne(id);
    }

    @Patch(':id')
    @ResponseMessage('Market updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateMarketDto,
    ) {
        return this.marketsService.update(id, data);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Market deleted successfully')
    delete(@Param('id', ParseUUIDPipe) id: string) {
        return this.marketsService.delete(id);
    }
}
