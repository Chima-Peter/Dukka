import { randomBytes } from 'node:crypto';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.module-definition.js';
import {
    STREAM_MAX_LEN,
    STREAM_READ_BLOCK_MS,
    STREAM_START_ID,
    type RedisStreamEntry,
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
    constructor(
        @Inject(REDIS_CLIENT)
        private readonly client: Redis,
    ) {}

    async onModuleDestroy(): Promise<void> {
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
     * Appends fields to the user's connection stream with approximate
     * `MAXLEN ~ 1000` trimming. Returns the new entry id.
     */
    async addToStream(
        userId: string,
        fields: Record<string, string>,
    ): Promise<string> {
        const flatFields = Object.entries(fields).flat();
        const id = await this.client.xadd(
            this.connectionStreamKey(userId),
            'MAXLEN',
            '~',
            STREAM_MAX_LEN,
            '*',
            ...flatFields,
        );

        if (id === null) {
            throw new Error(`Failed to add to stream for user ${userId}`);
        }

        return id;
    }

    /**
     * Blocking `XREAD` (BLOCK 0) on the user's connection stream.
     * Defaults to `$` (only new messages). Pass the last seen id to continue.
     */
    async readStream(
        userId: string,
        lastId = STREAM_START_ID,
    ): Promise<RedisStreamEntry[]> {
        const result = await this.client.xread(
            'BLOCK',
            STREAM_READ_BLOCK_MS,
            'STREAMS',
            this.connectionStreamKey(userId),
            lastId,
        );

        if (!result) {
            return [];
        }

        const entries: RedisStreamEntry[] = [];
        for (const [, messages] of result) {
            for (const [id, fields] of messages) {
                entries.push({ id, fields: this.fieldsToRecord(fields) });
            }
        }
        return entries;
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
