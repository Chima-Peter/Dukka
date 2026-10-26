import { randomBytes } from 'node:crypto';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.module-definition.js';
import { StreamReaderPool } from './stream-reader-pool.js';
import {
    STREAM_MAX_LEN,
    STREAM_READ_BLOCK_MS,
    STREAM_START_ID,
    type RedisStreamEntry,
    type StreamConnectionHandle,
} from './types/index.js';

const LOCK_SCRIPT = `
  return redis.call("SET", KEYS[1], ARGV[1], "PX", ARGV[2], "NX")
`;

const UNLOCK_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly streamReaderPool: StreamReaderPool;

    constructor(
        @Inject(REDIS_CLIENT)
        private readonly client: Redis,
    ) {
        this.streamReaderPool = new StreamReaderPool(client);
    }

    async onModuleDestroy(): Promise<void> {
        await this.streamReaderPool.destroy();
        await this.client.quit();
    }

    connectionStreamKey(userId: string): string {
        return `connection:${userId}`;
    }

    /**
     * Returns the connection stream key for `userId` (`connection:{userId}`).
     */
    async startStream(userId: string): Promise<string> {
        return this.connectionStreamKey(userId);
    }

    /**
     * Appends a typed payload to the user's connection stream with approximate
     * `MAXLEN ~ 1000` trimming. Returns the new entry id.
     */
    async addToStream(
        userId: string,
        type: string,
        data: object,
    ): Promise<string> {
        const payload = JSON.stringify(data);
        const id = await this.client.xadd(
            this.connectionStreamKey(userId),
            'MAXLEN',
            '~',
            STREAM_MAX_LEN,
            '*',
            'type',
            type,
            'data',
            payload,
        );

        if (id === null) {
            throw new Error(`Failed to add to stream for user ${userId}`);
        }

        return id;
    }

    /**
     * Returns the id of the most recent entry in `streamKey`, or `null` if the
     * stream is empty / missing.
     */
    async getStreamCursor(streamKey: string): Promise<string | null> {
        const entries = await this.client.xrevrange(streamKey, '+', '-', 'COUNT', 1);
        if (!entries || entries.length === 0) {
            return null;
        }
        return entries[0][0];
    }

    /**
     * In-memory check before opening SSE (max 3 connections per user).
     */
    assertSseConnectionAllowed(userId: string): void {
        this.streamReaderPool.assertConnectionAllowed(userId);
    }

    /**
     * Acquires a pooled stream reader slot for an SSE connection.
     * Enforces max 3 connections per user (in-memory) and max 100 per reader
     * (Redis Lua). Call `release()` when the SSE ends.
     */
    acquireStreamConnection(
        userId: string,
        signal?: AbortSignal,
    ): Promise<StreamConnectionHandle> {
        return this.streamReaderPool.acquire(
            userId,
            signal,
            (id) => this.connectionStreamKey(id),
        );
    }

    /**
     * Opens a dedicated Redis connection for blocking stream reads so XREAD
     * does not stall the shared client. Prefer `acquireStreamConnection` for
     * long-lived SSE. Call `close()` when done.
     */
    openStreamReader(signal?: AbortSignal): {
        read(userId: string): Promise<RedisStreamEntry[]>;
        close(): void;
    } {
        const reader = this.client.duplicate();
        const onAbort = () => {
            reader.disconnect();
        };
        signal?.addEventListener('abort', onAbort, { once: true });

        const close = () => {
            signal?.removeEventListener('abort', onAbort);
            reader.disconnect();
        };

        return {
            close,
            read: async (userId: string): Promise<RedisStreamEntry[]> => {
                if (signal?.aborted) {
                    return [];
                }

                try {
                    const result = await reader.xread(
                        'BLOCK',
                        STREAM_READ_BLOCK_MS,
                        'STREAMS',
                        this.connectionStreamKey(userId),
                        STREAM_START_ID,
                    );

                    if (!result) {
                        await reader.ping();
                        return [];
                    }

                    const entries: RedisStreamEntry[] = [];
                    for (const [, messages] of result) {
                        for (const [id, fields] of messages) {
                            entries.push({
                                id,
                                fields: this.fieldsToRecord(fields),
                            });
                        }
                    }
                    return entries;
                } catch (error) {
                    if (signal?.aborted) {
                        return [];
                    }
                    throw error;
                }
            },
        };
    }

    async readStream(
        userId: string,
        signal?: AbortSignal,
    ): Promise<RedisStreamEntry[]> {
        const streamReader = this.openStreamReader(signal);
        try {
            return await streamReader.read(userId);
        } finally {
            streamReader.close();
        }
    }

    /**
     * Deletes the user's connection stream key.
     */
    async closeStream(userId: string): Promise<void> {
        await this.client.del(this.connectionStreamKey(userId));
    }

    async set(
        key: string,
        value: string,
        ttlSeconds?: number,
    ): Promise<'OK' | null> {
        if (ttlSeconds !== undefined) {
            return this.client.set(key, value, 'EX', ttlSeconds);
        }

        return this.client.set(key, value);
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async setObject(
        key: string,
        value: unknown,
        ttlSeconds?: number,
    ): Promise<'OK' | null> {
        return this.set(key, JSON.stringify(value), ttlSeconds);
    }

    async getObject<T>(key: string): Promise<T | null> {
        const value = await this.get(key);
        if (value === null) {
            return null;
        }

        try {
            return JSON.parse(value) as T;
        } catch {
            return null;
        }
    }

    async delete(key: string): Promise<number> {
        return this.client.del(key);
    }

    async exists(key: string): Promise<boolean> {
        const count = await this.client.exists(key);
        return count === 1;
    }

    /**
     * Acquires a lock with a Lua `SET key token PX ttl NX` script.
     * Returns the lock token on success, or `null` if the key is already held.
     */
    async lock(key: string, ttlMs: number): Promise<string | null> {
        const token = randomBytes(16).toString('hex');
        const result = await this.client.eval(
            LOCK_SCRIPT,
            1,
            key,
            token,
            ttlMs,
        );

        return result === 'OK' ? token : null;
    }

    /**
     * Releases a lock only if `token` still owns it (Lua compare-and-delete).
     */
    async unlock(key: string, token: string): Promise<boolean> {
        const result = await this.client.eval(UNLOCK_SCRIPT, 1, key, token);
        return result === 1;
    }

    private fieldsToRecord(fields: string[]): Record<string, string> {
        const record: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
            record[fields[i]] = fields[i + 1] ?? '';
        }
        return record;
    }
}
