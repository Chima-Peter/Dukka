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
    Public,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
} from '@app/common';
import { CurrenciesService } from './currencies.service.js';
import { CreateCurrencyDto } from './dto/create-currency.dto.js';
import { UpdateCurrencyDto } from './dto/update-currency.dto.js';

@Auth('staff')
@Controller('currencies')
export class CurrenciesController {
    constructor(private readonly currenciesService: CurrenciesService) {}

    @Post()
    @RequirePermission(StaffPermission.CurrenciesCreate)
    @ResponseMessage('Currency created successfully')
    create(@Body() data: CreateCurrencyDto) {
        return this.currenciesService.create(data);
    }

    @Get()
    @Public()
    @ResponseMessage('Currencies retrieved successfully')
    findAll() {
        return this.currenciesService.findAll();
    }

    @Get(':id')
    @Public()
    @ResponseMessage('Currency retrieved successfully')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.currenciesService.findOne(id);
    }

    @Patch(':id')
    @RequirePermission(StaffPermission.CurrenciesUpdate)
    @ResponseMessage('Currency updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateCurrencyDto,
    ) {
        return this.currenciesService.update(id, data);
    }

    @Delete(':id')
    @RequirePermission(StaffPermission.CurrenciesDelete)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Currency deleted successfully')
    delete(@Param('id', ParseUUIDPipe) id: string) {
        return this.currenciesService.delete(id);
    }
}
