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
    Query,
} from '@nestjs/common';
import {
    Auth,
    CurrentCustomer,
    CurrentStaff,
    OptionalCustomerAuth,
    Public,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
    type CustomerJwtPayload,
    type StaffJwtPayload,
} from '@app/common';
import { CountriesService } from './countries.service.js';
import { AssignCountryMarketDto } from './dto/assign-country-market.dto.js';
import { CreateCountryDto } from './dto/create-country.dto.js';
import { FindCountriesDto } from './dto/find-countries.dto.js';
import { FindStaffCountriesDto } from './dto/find-staff-countries.dto.js';
import { UpdateCountryDto } from './dto/update-country.dto.js';

@Auth('staff')
@Controller('countries')
export class CountriesController {
    constructor(private readonly countriesService: CountriesService) {}

    @Post()
    @RequirePermission(StaffPermission.CountriesCreate)
    @ResponseMessage('Country created successfully')
    create(@Body() data: CreateCountryDto) {
        return this.countriesService.create(data);
    }

    @Get()
    @Public()
    @ResponseMessage('Countries retrieved successfully')
    findAll() {
        return this.countriesService.findAll();
    }

    @Get('staff')
    @ResponseMessage('Countries retrieved successfully')
    findAllForStaff(@Query() query: FindStaffCountriesDto) {
        return this.countriesService.findAllForStaff(query.status);
    }

    @Patch(':id')
    @RequirePermission(StaffPermission.CountriesUpdate)
    @ResponseMessage('Country updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateCountryDto,
    ) {
        return this.countriesService.update(id, data);
    }

    @Post(':id/open')
    @RequirePermission(StaffPermission.CountriesOpen)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Country opened successfully')
    open(@Param('id', ParseUUIDPipe) id: string) {
        return this.countriesService.open(id);
    }

    @Post(':id/close')
    @RequirePermission(StaffPermission.CountriesClose)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Country closed successfully')
    close(@Param('id', ParseUUIDPipe) id: string) {
        return this.countriesService.close(id);
    }

    @Post(':id/markets')
    @RequirePermission(StaffPermission.CountriesAssignMarket)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Country assigned to market successfully')
    assignMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: AssignCountryMarketDto,
    ) {
        return this.countriesService.assignMarket(
            id,
            data,
            staff.market_ids,
        );
    }

    @Delete(':id/markets/:marketId')
    @RequirePermission(StaffPermission.CountriesRemoveMarket)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Country removed from market successfully')
    removeMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('marketId', ParseUUIDPipe) marketId: string,
    ) {
        return this.countriesService.removeMarket(
            id,
            marketId,
            staff.market_ids,
        );
    }

    @Delete(':id')
    @RequirePermission(StaffPermission.CountriesDelete)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Country deleted successfully')
    delete(@Param('id', ParseUUIDPipe) id: string) {
        return this.countriesService.delete(id);
    }
}
