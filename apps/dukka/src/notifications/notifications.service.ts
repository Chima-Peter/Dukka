import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    type MessageEvent,
} from '@nestjs/common';
import { RedisService, type RedisStreamEntry } from '@app/common';
import { Observable } from 'rxjs';
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
        private readonly redisService: RedisService,
    ) {}


    streamForCustomer(
        customerId: string,
        signal: AbortSignal,
    ): Observable<MessageEvent> {
        return this.streamNotifications('customer', customerId, signal);
    }

    streamForStaff(
        staffId: string,
        signal: AbortSignal,
    ): Observable<MessageEvent> {
        return this.streamNotifications('staff', staffId, signal);
    }

    private streamNotifications(
        audience: 'customer' | 'staff',
        userId: string,
        signal: AbortSignal,
    ): Observable<MessageEvent> {
        return new Observable<MessageEvent>((subscriber) => {
            this.logger.log(
                `SSE notifications stream started for ${audience} ${userId}`,
            );
            let stopped = false;
            let connection: Awaited<
                ReturnType<RedisService['acquireStreamConnection']>
            > | null = null;

            const onAbort = () => {
                stopped = true;
                if (!subscriber.closed) {
                    subscriber.complete();
                }
            };
            signal.addEventListener('abort', onAbort, { once: true });

            const pump = async () => {
                try {
                    connection = await this.redisService.acquireStreamConnection(
                        userId,
                        signal,
                    );
                } catch (error) {
                    if (!stopped && !subscriber.closed) {
                        subscriber.error(error);
                    }
                    return;
                }

                this.logger.log(
                    `SSE notifications stream attached to reader ${connection.readerId} for ${audience} ${userId}`,
                );
                await this.redisService.startStream(userId);

                while (!stopped && !signal.aborted && !subscriber.closed) {
                    try {
                        const entries = await connection.read(userId);
                        if (stopped || subscriber.closed) {
                            break;
                        }

                        if (entries.length === 0) {
                            subscriber.next({
                                type: 'ping',
                                data: { ts: Date.now() },
                            });
                            continue;
                        }

                        for (const entry of entries) {
                            subscriber.next(this.toMessageEvent(entry));
                            setTimeout(() => {}, 200);
                        }
                    } catch (error) {
                        if (!stopped && !signal.aborted && !subscriber.closed) {
                            this.logger.error(
                                `SSE notifications stream error for ${audience} ${userId}: ${error}`,
                            );
                            subscriber.error({
                                type: 'error',
                                message:
                                    'An unexpected error occurred. Try again later.',
                                data: null,
                            });
                        }
                        return;
                    }
                }

                if (!subscriber.closed) {
                    subscriber.complete();
                }
            };

            void pump();

            return () => {
                stopped = true;
                void connection?.release();
                signal.removeEventListener('abort', onAbort);
                this.logger.log(
                    `SSE notifications stream closed for ${audience} ${userId}`,
                );
            };
        });
    }

    private toMessageEvent(entry: RedisStreamEntry): MessageEvent {
        return {
            id: entry.id,
            type: entry.fields.type ?? 'notification',
            data: JSON.parse(entry.fields.data) as object,
        };
    }

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
