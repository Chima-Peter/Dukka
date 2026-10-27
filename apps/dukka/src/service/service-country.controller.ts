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
import { ServiceCountryService } from './service-country.service.js';
import { AssignServiceCountryMarketDto } from './dto/assign-service-country-market.dto.js';
import { CreateServiceCountryDto } from './dto/create-service-country.dto.js';
import { FindStaffServiceCountriesDto } from './dto/find-staff-service-countries.dto.js';
import { UpdateServiceCountryDto } from './dto/update-service-country.dto.js';

@Auth('staff')
@Controller('service/countries')
export class ServiceCountryController {
    constructor(private readonly serviceCountryService: ServiceCountryService) {}

    @Post()
    @RequirePermission(StaffPermission.ServiceCountriesCreate)
    @ResponseMessage('Service country created successfully')
    create(@Body() data: CreateServiceCountryDto) {
        return this.serviceCountryService.create(data);
    }

    @Get()
    @Public()
    @ResponseMessage('Service countries retrieved successfully')
    findAll() {
        return this.serviceCountryService.findAll();
    }

    @Get('staff')
    @ResponseMessage('Service countries retrieved successfully')
    findAllForStaff(@Query() query: FindStaffServiceCountriesDto) {
        return this.serviceCountryService.findAllForStaff(query.status);
    }

    @Get('search')
    @Public()
    @ResponseMessage('Service country retrieved successfully')
    search(@Ip() clientIp: string) {
        return this.serviceCountryService.searchByIp(clientIp);
    }

    @Patch(':id')
    @RequirePermission(StaffPermission.ServiceCountriesUpdate)
    @ResponseMessage('Service country updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateServiceCountryDto,
    ) {
        return this.serviceCountryService.update(id, data);
    }

    @Post(':id/open')
    @RequirePermission(StaffPermission.ServiceCountriesOpen)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Service country opened successfully')
    open(@Param('id', ParseUUIDPipe) id: string) {
        return this.serviceCountryService.open(id);
    }

    @Post(':id/close')
    @RequirePermission(StaffPermission.ServiceCountriesClose)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Service country closed successfully')
    close(@Param('id', ParseUUIDPipe) id: string) {
        return this.serviceCountryService.close(id);
    }

    @Post(':id/markets')
    @RequirePermission(StaffPermission.ServiceCountriesAssignMarket)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Service country assigned to market successfully')
    assignMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: AssignServiceCountryMarketDto,
    ) {
        return this.serviceCountryService.assignMarket(
            id,
            data,
            staff.market_ids,
        );
    }

    @Delete(':id/markets/:marketId')
    @RequirePermission(StaffPermission.ServiceCountriesRemoveMarket)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Service country removed from market successfully')
    removeMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('marketId', ParseUUIDPipe) marketId: string,
    ) {
        return this.serviceCountryService.removeMarket(
            id,
            marketId,
            staff.market_ids,
        );
    }

    @Delete(':id')
    @RequirePermission(StaffPermission.ServiceCountriesDelete)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Service country deleted successfully')
    delete(@Param('id', ParseUUIDPipe) id: string) {
        return this.serviceCountryService.delete(id);
    }
}
