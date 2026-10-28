import {
    Body,
    Controller,
    Get,
    Headers,
    HttpCode,
    HttpStatus,
    Patch,
    Query,
    Sse,
    SseSignal,
    type MessageEvent,
} from '@nestjs/common';
import {
    Auth,
    CurrentCustomer,
    CurrentStaff,
    ResponseMessage,
    type CustomerJwtPayload,
    type StaffJwtPayload,
} from '@app/common';
import type { Observable } from 'rxjs';
import { FindNotificationsDto } from './dto/find-notifications.dto.js';
import { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
export class NotificationsController {
    constructor(
        private readonly notificationsService: NotificationsService,
    ) {}

    @Sse('stream')
    @Auth('customer')
    streamForCustomer(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @SseSignal() signal: AbortSignal,
        @Headers('last-event-id') lastEventId?: string,
    ): Observable<MessageEvent> {
        return this.notificationsService.streamForCustomer(
            customer.sub,
            signal,
            lastEventId,
        );
    }

    @Sse('internal/stream')
    @Auth('staff')
    streamForStaff(
        @CurrentStaff() staff: StaffJwtPayload,
        @SseSignal() signal: AbortSignal,
        @Headers('last-event-id') lastEventId?: string,
    ): Observable<MessageEvent> {
        return this.notificationsService.streamForStaff(
            staff.sub,
            signal,
            lastEventId,
        );
    }

    @Get()
    @Auth('customer')
    @ResponseMessage('Notifications retrieved successfully')
    findForCustomer(
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Query() query: FindNotificationsDto,
    ) {
        return this.notificationsService.findForCustomer(customer.sub, query);
    }

    @Get('internal')
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

    @Patch('internal/read')
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
