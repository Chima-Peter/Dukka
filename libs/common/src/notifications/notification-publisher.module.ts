import { Module } from '@nestjs/common';
import { NotificationPublisher } from './notification-publisher.service.js';

@Module({
    providers: [NotificationPublisher],
    exports: [NotificationPublisher],
})
export class NotificationPublisherModule {}
