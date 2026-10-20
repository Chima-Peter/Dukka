import { Module } from '@nestjs/common';
import { NotificationsServiceController } from './notifications_service.controller.js';
import { NotificationsServiceService } from './notifications_service.service.js';

@Module({
  imports: [],
  controllers: [NotificationsServiceController],
  providers: [NotificationsServiceService],
})
export class NotificationsServiceModule {}
