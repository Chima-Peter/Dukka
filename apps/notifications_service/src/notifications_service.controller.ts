import { Controller, Get } from '@nestjs/common';
import { NotificationsServiceService } from './notifications_service.service.js';

@Controller()
export class NotificationsServiceController {
  constructor(private readonly notificationsServiceService: NotificationsServiceService) {}

  @Get()
  getHello(): string {
    return this.notificationsServiceService.getHello();
  }
}
