import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Patch,
    Query,
} from '@nestjs/common';
import {
    Auth,
    CurrentCustomer,
    CurrentStaff,
    ResponseMessage,
    type CustomerJwtPayload,
    type StaffJwtPayload,
} from '@app/common';
import { FindNotificationsDto } from './dto/find-notifications.dto.js';
import { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
export class NotificationsController {
    constructor(
        private readonly notificationsService: NotificationsService,
    ) {}

    @Get()
    @Auth('customer')
    @ResponseMessage('Notifications retrieved successfully')
    findForCustomer(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Query() query: FindNotificationsDto,
    ) {
        return this.notificationsService.findForCustomer(customer.sub, query);
    }

    @Get('staff')
    @Auth('staff')
    @ResponseMessage('Notifications retrieved successfully')
    findForStaff(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: FindNotificationsDto,
    ) {
        return this.notificationsService.findForStaff(staff.sub, query);
    }

    @Patch('read')
    @Auth('customer')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Notifications marked as read')
    markReadForCustomer(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Body() data: MarkNotificationsReadDto,
    ) {
        return this.notificationsService.markReadForCustomer(
            customer.sub,
            data,
        );
    }

    @Patch('staff/read')
    @Auth('staff')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Notifications marked as read')
    markReadForStaff(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: MarkNotificationsReadDto,
    ) {
        return this.notificationsService.markReadForStaff(staff.sub, data);
    }
}
