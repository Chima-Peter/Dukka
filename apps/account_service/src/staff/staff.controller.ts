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
    ResponseMessage,
    type StaffJwtPayload,
} from '@app/common';
import { AssignRoleDto } from './dto/assign-role.dto.js';
import { ChangeStaffPasswordDto } from './dto/change_password.dto.js';
import { CreateQualificationDto } from './dto/create-qualification.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { CreateStaffProfileDto } from './dto/create-staff-profile.dto.js';
import { FindStaffAuditDto } from './dto/find-staff-audit.dto.js';
import { FindStaffDto } from './dto/find-staff.dto.js';
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

    @Post()
    @ResponseMessage('Staff created successfully')
    create(
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: CreateStaffDto,
    ) {
        return this.staffService.create(data, staff.sub);
    }

    @Get()
    @ResponseMessage('Staff retrieved successfully')
    findAll(@Query() query: FindStaffDto) {
        return this.staffService.findAll(query);
    }

    @Get(':id')
    @ResponseMessage('Staff retrieved successfully')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.staffService.findOne(id);
    }

    @Get(':id/audits')
    @ResponseMessage('Staff audit logs retrieved successfully')
    findAudits(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: FindStaffAuditDto,
    ) {
        return this.staffService.findAudits(id, query);
    }

    @Patch(':id')
    @ResponseMessage('Staff updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateStaffDto,
    ) {
        return this.staffService.update(id, data);
    }

    @Post(':id/role')
    @ResponseMessage('Role assigned to staff successfully')
    assignRole(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentStaff() staff: StaffJwtPayload,
        @Body() data: AssignRoleDto,
    ) {
        return this.staffService.assignRole(id, data, staff.sub);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Staff deactivated successfully')
    delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentStaff() staff: StaffJwtPayload,
    ) {
        return this.staffService.delete(id, staff.sub);
    }

    @Post(':id/avatar/upload-url')
    @ResponseMessage('Avatar upload URL generated successfully')
    getAvatarUploadURL(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: UploadFileDto,
    ) {
        return this.staffService.getAvatarUploadURL(id, query.name);
    }

    @Post(':id/profile')
    @ResponseMessage('Staff profile created successfully')
    createProfile(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: CreateStaffProfileDto,
    ) {
        return this.staffService.createProfile(id, data);
    }

    @Get(':id/profile')
    @ResponseMessage('Staff profile retrieved successfully')
    findProfile(@Param('id', ParseUUIDPipe) id: string) {
        return this.staffService.findProfile(id);
    }

    @Patch(':id/profile')
    @ResponseMessage('Staff profile updated successfully')
    updateProfile(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: UpdateStaffProfileDto,
    ) {
        return this.staffService.updateProfile(id, data);
    }

    @Post(':id/qualifications/upload-url')
    @ResponseMessage('Qualification upload URL generated successfully')
    getQualificationUploadURL(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: UploadFileDto,
    ) {
        return this.staffService.getQualificationUploadURL(id, query.name);
    }

    @Post(':id/qualifications')
    @ResponseMessage('Qualification created successfully')
    createQualification(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: CreateQualificationDto,
    ) {
        return this.staffService.createQualification(id, data);
    }

    @Get(':id/qualifications')
    @ResponseMessage('Qualifications retrieved successfully')
    findQualifications(@Param('id', ParseUUIDPipe) id: string) {
        return this.staffService.findQualifications(id);
    }

    @Patch(':id/qualifications/:qualificationId')
    @ResponseMessage('Qualification updated successfully')
    updateQualification(
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
