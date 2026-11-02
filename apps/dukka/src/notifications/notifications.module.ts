import { Module } from '@nestjs/common';
import { NotificationPublisherModule } from '@app/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsRepository } from './notifications.repository.js';
import { NotificationsService } from './notifications.service.js';

@Module({
    imports: [NotificationPublisherModule],
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationsRepository],
    exports: [NotificationsService, NotificationPublisherModule],
})
export class NotificationsModule {}
