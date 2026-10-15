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
import { ResponseMessage } from '@app/common';
import { CreateQualificationDto } from './dto/create-qualification.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { CreateStaffProfileDto } from './dto/create-staff-profile.dto.js';
import { FindStaffDto } from './dto/find-staff.dto.js';
import { UpdateQualificationDto } from './dto/update-qualification.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { UpdateStaffProfileDto } from './dto/update-staff-profile.dto.js';
import { StaffService } from './staff.service.js';

@Controller('staff')
export class StaffController {
    constructor(private readonly staffService: StaffService) {}

    @Post()
    @ResponseMessage('Staff created successfully')
    create(
        @Query('performed_by_staff_id', ParseUUIDPipe)
        performed_by_staff_id: string,
        @Body() data: CreateStaffDto,
    ) {
        return this.staffService.create(data, performed_by_staff_id);
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

    @Patch(':id')
    @ResponseMessage('Staff updated successfully')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('performed_by_staff_id', ParseUUIDPipe)
        performed_by_staff_id: string,
        @Body() data: UpdateStaffDto,
    ) {
        return this.staffService.update(id, data, performed_by_staff_id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Staff deactivated successfully')
    delete(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('performed_by_staff_id', ParseUUIDPipe)
        performed_by_staff_id: string,
    ) {
        return this.staffService.delete(id, performed_by_staff_id);
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

    @Delete(':id/profile')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Staff profile deleted successfully')
    deleteProfile(@Param('id', ParseUUIDPipe) id: string) {
        return this.staffService.deleteProfile(id);
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

    @Delete(':id/qualifications/:qualificationId')
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Qualification deleted successfully')
    deleteQualification(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('qualificationId', ParseUUIDPipe) qualificationId: string,
    ) {
        return this.staffService.deleteQualification(id, qualificationId);
    }
}
