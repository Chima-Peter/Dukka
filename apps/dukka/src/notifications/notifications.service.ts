import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import type { FindNotificationsDto } from './dto/find-notifications.dto.js';
import type { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto.js';
import {
    NotificationsRepository,
    type NotificationsPage,
} from './notifications.repository.js';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        private readonly notificationsRepository: NotificationsRepository,
    ) {}

    async findForCustomer(
        customer_id: string,
        query: FindNotificationsDto,
    ): Promise<NotificationsPage> {
        try {
            this.logger.log(
                `Fetching notifications for customer ${customer_id}`,
            );
            return await this.notificationsRepository.findForCustomer(
                customer_id,
                query,
            );
        } catch (error) {
            this.handleError(error);
        }
    }

    async findForStaff(
        staff_id: string,
        query: FindNotificationsDto,
    ): Promise<NotificationsPage> {
        try {
            this.logger.log(`Fetching notifications for staff ${staff_id}`);
            return await this.notificationsRepository.findForStaff(
                staff_id,
                query,
            );
        } catch (error) {
            this.handleError(error);
        }
    }

    async markReadForCustomer(
        customer_id: string,
        data: MarkNotificationsReadDto,
    ): Promise<{ count: number }> {
        try {
            this.logger.log(
                `Marking ${data.ids.length} notifications as read for customer ${customer_id}`,
            );
            const result = await this.notificationsRepository.markReadForCustomer(
                customer_id,
                data.ids,
            );
            if (result.count === 0) {
                throw new BadRequestException('No notifications found to update!');
            }
            return result;
        } catch (error) {
            this.handleError(error);
        }
    }

    async markReadForStaff(
        staff_id: string,
        data: MarkNotificationsReadDto,
    ): Promise<{ count: number }> {
        try {
            this.logger.log(
                `Marking ${data.ids.length} notifications as read for staff ${staff_id}`,
            );
            const result = await this.notificationsRepository.markReadForStaff(
                staff_id,
                data.ids,
            );
            if (result.count === 0) {
                throw new BadRequestException('No notifications found to update!');
            }
            return result;
        } catch (error) {
            this.handleError(error);
        }
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
