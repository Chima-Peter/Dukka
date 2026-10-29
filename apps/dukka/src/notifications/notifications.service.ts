import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    type MessageEvent,
} from '@nestjs/common';
import {
    RedisService,
    type Notification,
    type NotificationType,
    type RedisStreamEntry,
    type StreamConnectionHandle,
} from '@app/common';
import { Observable, type Subscriber } from 'rxjs';
import type { FindNotificationsDto } from './dto/find-notifications.dto.js';
import type { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto.js';
import {
    NotificationsRepository,
    type NotificationsPage,
} from './notifications.repository.js';
import type { CreateNotificationInput } from './types/create-notification.type.js';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        private readonly notificationsRepository: NotificationsRepository,
        private readonly redisService: RedisService,
    ) {}

    async notifyCustomer(
        customerId: string,
        input: CreateNotificationInput,
    ): Promise<Notification> {
        return this.createAndPublish({
            ...input,
            customer_id: customerId,
        });
    }

    async notifyStaff(
        staffId: string,
        input: CreateNotificationInput,
    ): Promise<Notification> {
        return this.createAndPublish({
            ...input,
            staff_id: staffId,
        });
    }

    private async createAndPublish(data: {
        title: string;
        type: NotificationType;
        text: string;
        customer_id?: string;
        staff_id?: string;
    }): Promise<Notification> {
        try {
            const recipientId = data.customer_id ?? data.staff_id;
            if (!recipientId) {
                throw new BadRequestException(
                    'Notification requires a customer_id or staff_id',
                );
            }

            const created = await this.notificationsRepository.create(data);
            const payload = this.toNotificationData(created);
            const streamId = await this.redisService.addToStream(
                recipientId,
                created.type,
                payload,
            );

            return await this.notificationsRepository.setStreamId(
                created.id,
                streamId,
            );
        } catch (error) {
            this.handleError(error);
        }
    }

    streamForCustomer(
        customerId: string,
        signal: AbortSignal,
        lastEventId?: string,
    ): Observable<MessageEvent> {
        return this.streamNotifications(
            'customer',
            customerId,
            signal,
            lastEventId,
        );
    }

    streamForStaff(
        staffId: string,
        signal: AbortSignal,
        lastEventId?: string,
    ): Observable<MessageEvent> {
        return this.streamNotifications('staff', staffId, signal, lastEventId);
    }

    private streamNotifications(
        audience: 'customer' | 'staff',
        userId: string,
        signal: AbortSignal,
        lastEventId?: string,
    ): Observable<MessageEvent> {
        this.redisService.assertSseConnectionAllowed(userId);

        return new Observable<MessageEvent>((subscriber) => {
            this.logger.log(
                `SSE notifications stream started for ${audience} ${userId}`,
            );
            let stopped = false;
            let connection: StreamConnectionHandle | null = null;
            const historicalStreamIds = new Set<string>();

            const onAbort = () => {
                stopped = true;
                if (!subscriber.closed) {
                    subscriber.complete();
                }
            };
            signal.addEventListener('abort', onAbort, { once: true });

            const isStopped = () =>
                stopped || signal.aborted || subscriber.closed;

            const pump = async () => {
                try {
                    const recentId = await this.redisService.getStreamCursor(
                        this.redisService.connectionStreamKey(userId),
                    );

                    connection =
                        await this.redisService.acquireStreamConnection(
                            userId,
                            signal,
                        );

                    this.logger.log(
                        `SSE notifications stream attached to reader ${connection.readerId} for ${audience} ${userId}`,
                    );
                    await this.redisService.startStream(userId);

                    const liveBuffer: RedisStreamEntry[] = [];
                    let historicalDone = false;

                    const livePump = this.bufferLiveEvents(
                        connection,
                        userId,
                        liveBuffer,
                        () => historicalDone,
                        historicalStreamIds,
                        subscriber,
                        isStopped,
                    );

                    const cursor = lastEventId?.trim();
                    if (cursor && recentId && !isStopped()) {
                        await this.streamHistorical(
                            audience,
                            userId,
                            cursor,
                            recentId,
                            historicalStreamIds,
                            subscriber,
                            isStopped,
                        );
                    }

                    historicalDone = true;
                    await this.emitLiveEntries(
                        liveBuffer.splice(0),
                        historicalStreamIds,
                        subscriber,
                        isStopped,
                    );

                    await livePump;

                    if (!subscriber.closed) {
                        subscriber.complete();
                    }
                } catch (error) {
                    if (!isStopped()) {
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

    private async bufferLiveEvents(
        connection: StreamConnectionHandle,
        userId: string,
        liveBuffer: RedisStreamEntry[],
        isHistoricalPending: () => boolean,
        historicalStreamIds: Set<string>,
        subscriber: Subscriber<MessageEvent>,
        isStopped: () => boolean,
    ): Promise<void> {
        while (!isStopped()) {
            try {
                const entries = await connection.read(userId);
                if (isStopped()) {
                    return;
                }

                if (entries.length === 0) {
                    if (!isHistoricalPending() && !subscriber.closed) {
                        subscriber.next({
                            type: 'ping',
                            data: { ts: Date.now() },
                        });
                    }
                    continue;
                }

                if (isHistoricalPending()) {
                    for (const entry of entries) {
                        if (!historicalStreamIds.has(entry.id)) {
                            liveBuffer.push(entry);
                        }
                    }
                } else {
                    await this.emitLiveEntries(
                        entries,
                        historicalStreamIds,
                        subscriber,
                        isStopped,
                    );
                }
            } catch (error) {
                if (isStopped()) {
                    return;
                }
                throw error;
            }
        }
    }

    private async emitLiveEntries(
        entries: RedisStreamEntry[],
        historicalStreamIds: Set<string>,
        subscriber: Subscriber<MessageEvent>,
        isStopped: () => boolean,
    ): Promise<void> {
        for (const entry of entries) {
            if (isStopped() || historicalStreamIds.has(entry.id)) {
                continue;
            }
            subscriber.next(this.toMessageEvent(entry));
            await sleep(EVENT_DELAY_MS);
        }
    }

    private async streamHistorical(
        audience: 'customer' | 'staff',
        userId: string,
        fromExclusive: string,
        toInclusive: string,
        historicalStreamIds: Set<string>,
        subscriber: Subscriber<MessageEvent>,
        isStopped: () => boolean,
    ): Promise<void> {
        const notifications =
            audience === 'customer'
                ? await this.notificationsRepository.findByStreamIdRangeForCustomer(
                      userId,
                      fromExclusive,
                      toInclusive,
                  )
                : await this.notificationsRepository.findByStreamIdRangeForStaff(
                      userId,
                      fromExclusive,
                      toInclusive,
                  );

        this.logger.log(
            `SSE historical catch-up for ${audience} ${userId}: ${notifications.length} events (${fromExclusive} → ${toInclusive})`,
        );

        for (const notification of notifications) {
            if (isStopped()) {
                return;
            }

            const streamId = notification.stream_id;
            if (!streamId) {
                continue;
            }

            subscriber.next(this.toHistoricalMessageEvent(notification));
            historicalStreamIds.add(streamId);
            await sleep(EVENT_DELAY_MS);
        }
    }

    private toNotificationData(notification: Notification): object {
        return {
            id: notification.id,
            title: notification.title,
            type: notification.type,
            text: notification.text,
            has_read: notification.has_read,
            created_at: notification.created_at,
            read_at: notification.read_at,
        };
    }

    private toMessageEvent(entry: RedisStreamEntry): MessageEvent {
        return {
            id: entry.id,
            type: entry.fields.type ?? 'notification',
            data: JSON.parse(entry.fields.data) as object,
        };
    }

    private toHistoricalMessageEvent(notification: Notification): MessageEvent {
        return {
            id: notification.stream_id!,
            type: notification.type,
            data: this.toNotificationData(notification),
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
            const page = await this.notificationsRepository.findForCustomer(
                customer_id,
                query,
            );
            this.logger.log(
                `Fetched notifications for customer ${customer_id}`,
            );
            return page;
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
            const page = await this.notificationsRepository.findForStaff(
                staff_id,
                query,
            );
            this.logger.log(`Fetched notifications for staff ${staff_id}`);
            return page;
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
            const result =
                await this.notificationsRepository.markReadForCustomer(
                    customer_id,
                    data.ids,
                );
            if (result.count === 0) {
                throw new BadRequestException(
                    'No notifications found to update!',
                );
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
                throw new BadRequestException(
                    'No notifications found to update!',
                );
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

const EVENT_DELAY_MS = 100;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
