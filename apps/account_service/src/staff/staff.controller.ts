import { Controller } from '@nestjs/common';
import { StaffService } from './staff.service.js';

@Controller('staff')
export class StaffController {
    constructor(private readonly staffService: StaffService) {}
}
