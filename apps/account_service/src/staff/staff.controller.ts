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
    CurrentStaff,
    RequirePermission,
    ResponseMessage,
    StaffPermission,
    type StaffJwtPayload,
} from '@app/common';
import { AssignStaffMarketDto } from './dto/assign-market.dto.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';
import { ChangeStaffPasswordDto } from './dto/change_password.dto.js';
import { CreateQualificationDto } from './dto/create-qualification.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { CreateStaffProfileDto } from './dto/create-staff-profile.dto.js';
import { FindStaffAuditDto } from './dto/find-staff-audit.dto.js';
import { FindStaffDto } from './dto/find-staff.dto.js';
import { RemoveStaffMarketDto } from './dto/remove-market.dto.js';
import { UpdateQualificationDto } from './dto/update-qualification.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { UpdateStaffProfileDto } from './dto/update-staff-profile.dto.js';
import { UploadFileDto } from './dto/upload-file.dto.js';
import { StaffAuthService } from './staff-auth.service.js';
import { StaffService } from './staff.service.js';

@Auth('staff')
@Controller('staff')
export class StaffController {
    constructor(
        private readonly staffService: StaffService,
        private readonly staffAuthService: StaffAuthService,
    ) {}

    @Get('me')
    @ResponseMessage('Staff profile retrieved successfully')
    getMe(@CurrentStaff() staff: StaffJwtPayload) {
        return this.staffService.findOne(staff.sub);
    }

    @Patch('me')
    @ResponseMessage('Staff updated successfully')
    updateMe(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: UpdateStaffDto,
    ) {
        return this.staffService.update(staff.sub, data);
    }

    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage(
        'Password changed successfully. Please login with your new password.',
    )
    changePassword(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: ChangeStaffPasswordDto,
    ) {
        return this.staffAuthService.changePassword(staff.sub, data);
    }

    @Post('me/avatar/upload-url')
    @ResponseMessage('Avatar upload URL generated successfully')
    getAvatarUploadURL(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: UploadFileDto,
    ) {
        return this.staffService.getAvatarUploadURL(staff.sub, query.name);
    }

    @Post('me/profile')
    @ResponseMessage('Staff profile created successfully')
    createProfile(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: CreateStaffProfileDto,
    ) {
        return this.staffService.createProfile(staff.sub, data);
    }

    @Get('me/profile')
    @ResponseMessage('Staff profile retrieved successfully')
    findProfile(@CurrentStaff() staff: StaffJwtPayload) {
        return this.staffService.findProfile(staff.sub);
    }

    @Patch('me/profile')
    @ResponseMessage('Staff profile updated successfully')
    updateProfile(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: UpdateStaffProfileDto,
    ) {
        return this.staffService.updateProfile(staff.sub, data);
    }

    @Post('me/qualifications/upload-url')
    @ResponseMessage('Qualification upload URL generated successfully')
    getQualificationUploadURL(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: UploadFileDto,
    ) {
        return this.staffService.getQualificationUploadURL(
            staff.sub,
            query.name,
        );
    }

    @Post('me/qualifications')
    @ResponseMessage('Qualification created successfully')
    createQualification(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: CreateQualificationDto,
    ) {
        return this.staffService.createQualification(staff.sub, data);
    }

    @Get('me/qualifications')
    @ResponseMessage('Qualifications retrieved successfully')
    findQualifications(@CurrentStaff() staff: StaffJwtPayload) {
        return this.staffService.findQualifications(staff.sub);
    }

    @Patch('me/qualifications/:qualificationId')
    @ResponseMessage('Qualification updated successfully')
    updateQualification(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('qualificationId', ParseUUIDPipe) qualificationId: string,
        @Body() data: UpdateQualificationDto,
    ) {
        return this.staffService.updateQualification(
            staff.sub,
            qualificationId,
            data,
        );
    }

    @Post()
    @RequirePermission(StaffPermission.StaffCreate)
    @ResponseMessage('Staff created successfully')
    create(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: CreateStaffDto,
    ) {
        return this.staffService.create(data, staff.sub);
    }

    @Get()
    @RequirePermission(StaffPermission.StaffRead)
    @ResponseMessage('Staff retrieved successfully')
    findAll(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: FindStaffDto,
    ) {
        return this.staffService.findAll(
            query,
            staff.market_ids,
            staff.hierarchy,
        );
    }

    @Get(':id')
    @RequirePermission(StaffPermission.StaffRead)
    @ResponseMessage('Staff retrieved successfully')
    findOne(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.staffService.findOne(id, {
            market_ids: staff.market_ids,
            hierarchy: staff.hierarchy,
        });
    }

    @Patch(':id')
    @RequirePermission(StaffPermission.StaffTechnicalSupport)
    @ResponseMessage('Staff updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateStaffDto,
    ) {
        return this.staffService.update(id, data);
    }

    @Get(':id/audits')
    @RequirePermission(StaffPermission.StaffReadAudits)
    @ResponseMessage('Staff audit logs retrieved successfully')
    findAudits(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: FindStaffAuditDto,
    ) {
        return this.staffService.findAudits(
            id,
            query,
            staff.market_ids,
            staff.hierarchy,
        );
    }

    @Post(':id/role')
    @RequirePermission(StaffPermission.StaffAssignRole)
    @ResponseMessage('Role assigned to staff successfully')
    assignRole(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: AssignRoleDto,
    ) {
        return this.staffService.assignRole(id, data, staff.sub);
    }

    @Post(':id/markets')
    @RequirePermission(StaffPermission.StaffAssignMarkets)
    @ResponseMessage('Markets assigned to staff successfully')
    assignMarkets(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: AssignStaffMarketDto,
    ) {
        return this.staffService.assignMarkets(id, data, staff.sub);
    }

    @Delete(':id/markets')
    @RequirePermission(StaffPermission.StaffRemoveMarkets)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Markets removed from staff successfully')
    removeMarkets(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: RemoveStaffMarketDto,
    ) {
        return this.staffService.removeMarkets(id, data, staff.sub);
    }

    @Delete(':id')
    @RequirePermission(StaffPermission.StaffDelete)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Staff deactivated successfully')
    delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentStaff() staff: StaffJwtPayload,
    ) {
        return this.staffService.delete(id, staff.sub);
    }

    @Post(':id/avatar/upload-url')
    @RequirePermission(StaffPermission.StaffTechnicalSupport)
    @ResponseMessage('Avatar upload URL generated successfully')
    getStaffAvatarUploadURL(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: UploadFileDto,
    ) {
        return this.staffService.getAvatarUploadURL(id, query.name);
    }

    @Post(':id/profile')
    @RequirePermission(StaffPermission.StaffTechnicalSupport)
    @ResponseMessage('Staff profile created successfully')
    createStaffProfile(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: CreateStaffProfileDto,
    ) {
        return this.staffService.createProfile(id, data);
    }

    @Get(':id/profile')
    @RequirePermission(StaffPermission.StaffTechnicalSupport)
    @ResponseMessage('Staff profile retrieved successfully')
    findStaffProfile(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.staffService.findProfile(id, {
            market_ids: staff.market_ids,
            hierarchy: staff.hierarchy,
        });
    }

    @Patch(':id/profile')
    @RequirePermission(StaffPermission.StaffTechnicalSupport)
    @ResponseMessage('Staff profile updated successfully')
    updateStaffProfile(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateStaffProfileDto,
    ) {
        return this.staffService.updateProfile(id, data);
    }

    @Post(':id/qualifications/upload-url')
    @RequirePermission(StaffPermission.StaffTechnicalSupport)
    @ResponseMessage('Qualification upload URL generated successfully')
    getStaffQualificationUploadURL(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: UploadFileDto,
    ) {
        return this.staffService.getQualificationUploadURL(id, query.name);
    }

    @Post(':id/qualifications')
    @RequirePermission(StaffPermission.StaffTechnicalSupport)
    @ResponseMessage('Qualification created successfully')
    createStaffQualification(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: CreateQualificationDto,
    ) {
        return this.staffService.createQualification(id, data);
    }

    @Get(':id/qualifications')
    @RequirePermission(StaffPermission.StaffTechnicalSupport)
    @ResponseMessage('Qualifications retrieved successfully')
    findStaffQualifications(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.staffService.findQualifications(id, {
            market_ids: staff.market_ids,
            hierarchy: staff.hierarchy,
        });
    }

    @Patch(':id/qualifications/:qualificationId')
    @RequirePermission(StaffPermission.StaffTechnicalSupport)
    @ResponseMessage('Qualification updated successfully')
    updateStaffQualification(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('qualificationId', ParseUUIDPipe) qualificationId: string,
        @Body() data: UpdateQualificationDto,
    ) {
        return this.staffService.updateQualification(
            id,
            qualificationId,
            data,
        );
    }
}
