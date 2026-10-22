import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
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
import { AcceptStaffInvitationDto } from './dto/accept-staff-invitation.dto.js';
import { FindStaffInvitationsDto } from './dto/find-staff-invitations.dto.js';
import { InviteStaffDto } from './dto/invite-staff.dto.js';
import { InvitationsService } from './invitations.service.js';

@Auth('staff')
@Controller('staff/invitations')
export class InvitationsController {
    constructor(private readonly invitationsService: InvitationsService) {}

    @Post()
    @RequirePermission(StaffPermission.StaffCreate)
    @ResponseMessage('Staff invited successfully')
    invite(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: InviteStaffDto,
    ) {
        return this.invitationsService.invite(data, staff.sub);
    }

    @Get()
    @RequirePermission(StaffPermission.StaffRead)
    @ResponseMessage('Staff invitations retrieved successfully')
    findAll(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: FindStaffInvitationsDto,
    ) {
        return this.invitationsService.findAll(
            query,
            staff.market_ids,
            staff.hierarchy,
        );
    }

    @Get(':id')
    @RequirePermission(StaffPermission.StaffRead)
    @ResponseMessage('Staff invitation retrieved successfully')
    findOne(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.invitationsService.findOne(
            id,
            staff.market_ids,
            staff.hierarchy,
        );
    }

    @Post(':id/cancel')
    @RequirePermission(StaffPermission.StaffCreate)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Staff invitation cancelled successfully')
    cancel(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.invitationsService.cancel(id, staff.sub);
    }

    @Post('accept')
    @Public()
    @ResponseMessage(
        'Invitation accepted. You can now login with your new password.',
    )
    accept(@Body() data: AcceptStaffInvitationDto) {
        return this.invitationsService.accept(data);
    }

    @Post(':id/resend')
    @RequirePermission(StaffPermission.StaffCreate)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Staff invitation resent successfully')
    resend(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.invitationsService.resend(id, staff.sub);
    }
}
