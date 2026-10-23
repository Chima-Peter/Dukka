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
    Public,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
    type StaffJwtPayload,
} from '@app/common';
import { CountriesService } from './countries.service.js';
import { AssignCountryMarketDto } from './dto/assign-country-market.dto.js';
import { CreateCountryDto } from './dto/create-country.dto.js';
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

    @Patch(':id')
    @RequirePermission(StaffPermission.CountriesUpdate)
    @ResponseMessage('Country updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateCountryDto,
    ) {
        return this.countriesService.update(id, data);
    }

    @Post(':id/approve')
    @RequirePermission(StaffPermission.CountriesApprove)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Country approved successfully')
    approve(@Param('id', ParseUUIDPipe) id: string) {
        return this.countriesService.approve(id);
    }

    @Post(':id/reject')
    @RequirePermission(StaffPermission.CountriesApprove)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Country rejected successfully')
    reject(@Param('id', ParseUUIDPipe) id: string) {
        return this.countriesService.reject(id);
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
