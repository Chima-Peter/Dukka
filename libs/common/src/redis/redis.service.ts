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

/**
 * Atomically return a cached result, or acquire the lock if none exists.
 * KEYS[1]=result key, KEYS[2]=lock key, ARGV[1]=token, ARGV[2]=lock TTL ms.
 * Returns { "hit", value } | { "acquired", token } | { "busy" }.
 */
const GET_OR_LOCK_SCRIPT = `
  local existing = redis.call("GET", KEYS[1])
  if existing then
    return { "hit", existing }
  end

  local ok = redis.call("SET", KEYS[2], ARGV[1], "PX", ARGV[2], "NX")
  if ok then
    return { "acquired", ARGV[1] }
  end

  return { "busy" }
`;

/**
 * Atomically resolve a versioned cache key, return the cached value, or lock.
 * KEYS[1]=version key, KEYS[2]=lock key
 * ARGV[1]=key prefix, ARGV[2]=key suffix, ARGV[3]=token, ARGV[4]=lock TTL ms.
 * Returns { "hit", value, resultKey, version }
 *      | { "acquired", token, resultKey, version }
 *      | { "busy", "", resultKey, version }.
 */
const GET_VERSIONED_OBJECT_OR_LOCK_SCRIPT = `
  local version = redis.call("GET", KEYS[1])
  if not version then
    version = "0"
  end

  local resultKey = ARGV[1] .. version .. ARGV[2]
  local existing = redis.call("GET", resultKey)
  if existing then
    return { "hit", existing, resultKey, version }
  end

  local ok = redis.call("SET", KEYS[2], ARGV[3], "PX", ARGV[4], "NX")
  if ok then
    return { "acquired", ARGV[3], resultKey, version }
  end

  return { "busy", "", resultKey, version }
`;

/**
 * Atomically SET a result value and unlock if still owned.
 * KEYS[1]=result key, KEYS[2]=lock key
 * ARGV[1]=value, ARGV[2]=TTL seconds, ARGV[3]=token.
 * Returns 1 if unlocked, else 0.
 */
const SET_OBJECT_AND_UNLOCK_SCRIPT = `
  redis.call("SET", KEYS[1], ARGV[1], "EX", tonumber(ARGV[2]))
  if redis.call("GET", KEYS[2]) == ARGV[3] then
    return redis.call("DEL", KEYS[2])
  end
  return 0
`;

/**
 * Atomically bump one or more version keys.
 * KEYS=version keys, ARGV[1]=new version.
 * Returns the number of keys updated.
 */
const INVALIDATE_VERSION_KEYS_SCRIPT = `
  for i = 1, #KEYS do
    redis.call("SET", KEYS[i], ARGV[1])
  end
  return #KEYS
`;

export type RedisGetOrLockResult =
    | { status: 'hit'; value: string }
    | { status: 'acquired'; token: string }
    | { status: 'busy' };

export type RedisGetObjectOrLockResult<T> =
    | { status: 'hit'; value: T }
    | { status: 'acquired'; token: string }
    | { status: 'busy' };

export type RedisGetVersionedObjectOrLockResult<T> =
    | {
          status: 'hit';
          value: T;
          resultKey: string;
          version: string;
      }
    | {
          status: 'acquired';
          token: string;
          resultKey: string;
          version: string;
      }
    | {
          status: 'busy';
          resultKey: string;
          version: string;
      };

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

    async ping(): Promise<string> {
        return this.client.ping();
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
     * Atomically GET `resultKey`, or SET NX lock on `lockKey` when missing.
     * - `hit`: cached result string
     * - `acquired`: caller owns the lock (`token`)
     * - `busy`: another holder owns the lock and no result yet
     */
    async getOrLock(
        resultKey: string,
        lockKey: string,
        ttlMs: number,
    ): Promise<RedisGetOrLockResult> {
        const token = randomBytes(16).toString('hex');
        const result = await this.client.eval(
            GET_OR_LOCK_SCRIPT,
            2,
            resultKey,
            lockKey,
            token,
            ttlMs,
        );

        return this.parseGetOrLockResult(result);
    }

    /**
     * Like {@link getOrLock}, but parses a JSON hit into `T`.
     * Corrupt cached JSON is treated as `busy`.
     */
    async getObjectOrLock<T>(
        resultKey: string,
        lockKey: string,
        ttlMs: number,
    ): Promise<RedisGetObjectOrLockResult<T>> {
        const outcome = await this.getOrLock(resultKey, lockKey, ttlMs);
        if (outcome.status !== 'hit') {
            return outcome;
        }

        try {
            return {
                status: 'hit',
                value: JSON.parse(outcome.value) as T,
            };
        } catch {
            return { status: 'busy' };
        }
    }

    /**
     * Atomically read a version key, GET the versioned cache entry, or lock.
     * Corrupt cached JSON is treated as `busy`.
     */
    async getVersionedObjectOrLock<T>(
        versionKey: string,
        lockKey: string,
        keyPrefix: string,
        keySuffix: string,
        lockTtlMs: number,
    ): Promise<RedisGetVersionedObjectOrLockResult<T>> {
        const token = randomBytes(16).toString('hex');
        const result = await this.client.eval(
            GET_VERSIONED_OBJECT_OR_LOCK_SCRIPT,
            2,
            versionKey,
            lockKey,
            keyPrefix,
            keySuffix,
            token,
            lockTtlMs,
        );

        return this.parseGetVersionedObjectOrLockResult<T>(result);
    }

    /**
     * Atomically SET a JSON value with TTL and unlock if `token` still owns the lock.
     */
    async setObjectAndUnlock(
        resultKey: string,
        lockKey: string,
        value: unknown,
        ttlSeconds: number,
        token: string,
    ): Promise<boolean> {
        const result = await this.client.eval(
            SET_OBJECT_AND_UNLOCK_SCRIPT,
            2,
            resultKey,
            lockKey,
            JSON.stringify(value),
            ttlSeconds,
            token,
        );
        return result === 1;
    }

    /**
     * Atomically set one or more version keys to `version` (defaults to now).
     */
    async invalidateVersionKeys(
        versionKeys: string[],
        version: string = Date.now().toString(),
    ): Promise<string> {
        if (versionKeys.length === 0) {
            return version;
        }

        await this.client.eval(
            INVALIDATE_VERSION_KEYS_SCRIPT,
            versionKeys.length,
            ...versionKeys,
            version,
        );
        return version;
    }

    /**
     * Releases a lock only if `token` still owns it (Lua compare-and-delete).
     */
    async unlock(key: string, token: string): Promise<boolean> {
        const result = await this.client.eval(UNLOCK_SCRIPT, 1, key, token);
        return result === 1;
    }

    private parseGetOrLockResult(result: unknown): RedisGetOrLockResult {
        if (!Array.isArray(result) || result.length === 0) {
            return { status: 'busy' };
        }

        const status = result[0];
        if (status === 'hit' && typeof result[1] === 'string') {
            return { status: 'hit', value: result[1] };
        }
        if (status === 'acquired' && typeof result[1] === 'string') {
            return { status: 'acquired', token: result[1] };
        }

        return { status: 'busy' };
    }

    private parseGetVersionedObjectOrLockResult<T>(
        result: unknown,
    ): RedisGetVersionedObjectOrLockResult<T> {
        if (!Array.isArray(result) || result.length < 4) {
            return { status: 'busy', resultKey: '', version: '0' };
        }

        const status = result[0];
        const payload = result[1];
        const resultKey = typeof result[2] === 'string' ? result[2] : '';
        const version = typeof result[3] === 'string' ? result[3] : '0';

        if (status === 'hit' && typeof payload === 'string') {
            try {
                return {
                    status: 'hit',
                    value: JSON.parse(payload) as T,
                    resultKey,
                    version,
                };
            } catch {
                return { status: 'busy', resultKey, version };
            }
        }

        if (status === 'acquired' && typeof payload === 'string') {
            return {
                status: 'acquired',
                token: payload,
                resultKey,
                version,
            };
        }

        return { status: 'busy', resultKey, version };
    }

    private fieldsToRecord(fields: string[]): Record<string, string> {
        const record: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
            record[fields[i]] = fields[i + 1] ?? '';
        }
        return record;
    }
}
