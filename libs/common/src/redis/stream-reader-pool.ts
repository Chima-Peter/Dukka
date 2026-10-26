import { randomUUID } from 'node:crypto';
import {
    HttpException,
    HttpStatus,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import {
    MAX_CONNECTIONS_PER_READER,
    MAX_SSE_CONNECTIONS_PER_USER,
    SSE_READER_COUNTS_KEY,
    SSE_READERS_KEY,
    STREAM_READ_BLOCK_MS,
    STREAM_START_ID,
    sseUserReaderKey,
    type RedisStreamEntry,
    type StreamConnectionHandle,
} from './types/index.js';

/**
 * Atomically pick a reader with capacity, or append a new reader id.
 * KEYS[1] = sse:readers (JSON array)
 * KEYS[2] = sse:reader:counts (hash)
 * KEYS[3] = sse:user:{userId}:reader
 * ARGV[1] = max connections per reader
 * ARGV[2] = candidate new reader id
 */
const ACQUIRE_READER_SCRIPT = `
  local readers_json = redis.call("GET", KEYS[1])
  local readers = {}
  if readers_json then
    readers = cjson.decode(readers_json)
  end

  local max_conns = tonumber(ARGV[1])
  local chosen = nil
  local created = 0

  for _, rid in ipairs(readers) do
    local count = tonumber(redis.call("HGET", KEYS[2], rid) or "0")
    if count < max_conns then
      chosen = rid
      break
    end
  end

  if not chosen then
    chosen = ARGV[2]
    readers[#readers + 1] = chosen
    redis.call("SET", KEYS[1], cjson.encode(readers))
    created = 1
  end

  local count = redis.call("HINCRBY", KEYS[2], chosen, 1)
  redis.call("SET", KEYS[3], chosen)

  return { chosen, created, count }
`;

/**
 * Decrement reader occupancy; drop empty readers from the array.
 * KEYS[1] = sse:readers
 * KEYS[2] = sse:reader:counts
 * KEYS[3] = sse:user:{userId}:reader (optional clear when ARGV[2] == "1")
 * ARGV[1] = reader id
 * ARGV[2] = "1" to clear user->reader, else "0"
 */
const RELEASE_READER_SCRIPT = `
  local reader_id = ARGV[1]
  local count = redis.call("HINCRBY", KEYS[2], reader_id, -1)

  if count <= 0 then
    redis.call("HDEL", KEYS[2], reader_id)
    local readers_json = redis.call("GET", KEYS[1])
    if readers_json then
      local readers = cjson.decode(readers_json)
      local next_readers = {}
      for _, rid in ipairs(readers) do
        if rid ~= reader_id then
          next_readers[#next_readers + 1] = rid
        end
      end
      if #next_readers == 0 then
        redis.call("DEL", KEYS[1])
      else
        redis.call("SET", KEYS[1], cjson.encode(next_readers))
      end
    end
    count = 0
  end

  if ARGV[2] == "1" then
    redis.call("DEL", KEYS[3])
  end

  return count
`;

type PendingRead = {
    userId: string;
    resolve: (entries: RedisStreamEntry[]) => void;
    reject: (error: Error) => void;
};

type LocalReader = {
    id: string;
    redis: Redis;
    connectionIds: Set<string>;
    pending: Map<string, PendingRead>;
    loopRunning: boolean;
    closed: boolean;
};

export class StreamReaderPool {
    private readonly logger = new Logger(StreamReaderPool.name);
    private readonly userConnections = new Map<string, Set<string>>();
    private readonly readers = new Map<string, LocalReader>();
    private readonly connectionReader = new Map<string, string>();
    private readonly connectionUser = new Map<string, string>();

    constructor(private readonly client: Redis) {}

    async destroy(): Promise<void> {
        const readerIds = [...this.readers.keys()];
        for (const readerId of readerIds) {
            await this.destroyLocalReader(readerId);
        }
        this.userConnections.clear();
        this.connectionReader.clear();
        this.connectionUser.clear();
    }

    /**
     * In-memory check: user may not exceed max simultaneous SSE connections.
     * Call before returning an SSE Observable so Nest can send HTTP 429.
     */
    assertConnectionAllowed(userId: string): void {
        const existing = this.userConnections.get(userId);
        if (existing && existing.size >= MAX_SSE_CONNECTIONS_PER_USER) {
            throw new HttpException(
                `Maximum of ${MAX_SSE_CONNECTIONS_PER_USER} simultaneous SSE connections allowed`,
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
    }

    /**
     * Enforces max 3 SSE connections per user (in-memory), then uses a Lua
     * script to assign a pooled reader (max 100 connections each).
     */
    async acquire(
        userId: string,
        signal?: AbortSignal,
        connectionStreamKey: (userId: string) => string = (id) =>
            `connection:${id}`,
    ): Promise<StreamConnectionHandle> {
        if (signal?.aborted) {
            throw new ServiceUnavailableException('SSE connection aborted');
        }

        this.assertConnectionAllowed(userId);

        const connectionId = randomUUID();
        const connections =
            this.userConnections.get(userId) ?? new Set<string>();
        connections.add(connectionId);
        this.userConnections.set(userId, connections);
        this.connectionUser.set(connectionId, userId);

        try {
            const newReaderId = randomUUID();
            const result = (await this.client.eval(
                ACQUIRE_READER_SCRIPT,
                3,
                SSE_READERS_KEY,
                SSE_READER_COUNTS_KEY,
                sseUserReaderKey(userId),
                MAX_CONNECTIONS_PER_READER,
                newReaderId,
            )) as [string, number, number];

            const readerId = result[0];
            const created = Number(result[1]) === 1;

            this.connectionReader.set(connectionId, readerId);
            const local = this.ensureLocalReader(readerId);
            local.connectionIds.add(connectionId);

            if (created) {
                this.logger.log(`Started stream reader ${readerId}`);
            }

            const onAbort = () => {
                void this.release(connectionId);
            };
            signal?.addEventListener('abort', onAbort, { once: true });

            return {
                readerId,
                connectionId,
                read: (readUserId: string) =>
                    this.read(connectionId, readUserId, connectionStreamKey),
                release: async () => {
                    signal?.removeEventListener('abort', onAbort);
                    await this.release(connectionId);
                },
            };
        } catch (error) {
            connections.delete(connectionId);
            if (connections.size === 0) {
                this.userConnections.delete(userId);
            }
            this.connectionUser.delete(connectionId);
            throw error;
        }
    }

    private ensureLocalReader(readerId: string): LocalReader {
        let local = this.readers.get(readerId);
        if (local && !local.closed) {
            return local;
        }

        local = {
            id: readerId,
            redis: this.client.duplicate(),
            connectionIds: new Set(),
            pending: new Map(),
            loopRunning: false,
            closed: false,
        };
        this.readers.set(readerId, local);
        return local;
    }

    private read(
        connectionId: string,
        userId: string,
        connectionStreamKey: (userId: string) => string,
    ): Promise<RedisStreamEntry[]> {
        const readerId = this.connectionReader.get(connectionId);
        if (!readerId) {
            return Promise.resolve([]);
        }

        const local = this.readers.get(readerId);
        if (!local || local.closed) {
            return Promise.resolve([]);
        }

        return new Promise<RedisStreamEntry[]>((resolve, reject) => {
            local.pending.set(connectionId, {
                userId,
                resolve,
                reject,
            });
            void this.runReaderLoop(local, connectionStreamKey);
        });
    }

    private async runReaderLoop(
        local: LocalReader,
        connectionStreamKey: (userId: string) => string,
    ): Promise<void> {
        if (local.loopRunning || local.closed) {
            return;
        }
        local.loopRunning = true;

        try {
            while (!local.closed && local.connectionIds.size > 0) {
                if (local.pending.size === 0) {
                    await sleep(25);
                    continue;
                }

                const userIds = [
                    ...new Set(
                        [...local.pending.values()].map((p) => p.userId),
                    ),
                ];
                const keys = userIds.map((id) => connectionStreamKey(id));
                const ids = userIds.map(() => STREAM_START_ID);
                const keyToUserId = new Map(
                    userIds.map((id, index) => [keys[index], id]),
                );

                let result: [string, [string, string[]][]][] | null;
                try {
                    result = (await local.redis.xread(
                        'BLOCK',
                        STREAM_READ_BLOCK_MS,
                        'STREAMS',
                        ...keys,
                        ...ids,
                    )) as [string, [string, string[]][]][] | null;
                } catch (error) {
                    if (local.closed) {
                        this.rejectAllPending(local, error as Error);
                        return;
                    }
                    throw error;
                }

                if (!result) {
                    await local.redis.ping();
                    this.resolveAllPending(local, []);
                    continue;
                }

                const entriesByUser = new Map<string, RedisStreamEntry[]>();
                for (const [streamKey, messages] of result) {
                    const userId =
                        keyToUserId.get(streamKey) ??
                        [...keyToUserId.entries()].find(([key]) =>
                            streamKey.endsWith(key),
                        )?.[1];
                    if (!userId) {
                        continue;
                    }
                    const entries: RedisStreamEntry[] = [];
                    for (const [id, fields] of messages) {
                        entries.push({
                            id,
                            fields: fieldsToRecord(fields),
                        });
                    }
                    entriesByUser.set(userId, entries);
                }

                for (const [connectionId, pending] of [...local.pending]) {
                    const entries = entriesByUser.get(pending.userId);
                    if (!entries) {
                        continue;
                    }
                    local.pending.delete(connectionId);
                    pending.resolve(entries);
                }
            }
        } catch (error) {
            this.logger.error(
                `Stream reader ${local.id} loop error: ${String(error)}`,
            );
            this.rejectAllPending(local, error as Error);
        } finally {
            local.loopRunning = false;
            if (
                !local.closed &&
                local.connectionIds.size > 0 &&
                local.pending.size > 0
            ) {
                void this.runReaderLoop(local, connectionStreamKey);
            }
        }
    }

    private resolveAllPending(
        local: LocalReader,
        entries: RedisStreamEntry[],
    ): void {
        for (const [connectionId, pending] of [...local.pending]) {
            local.pending.delete(connectionId);
            pending.resolve(entries);
        }
    }

    private rejectAllPending(local: LocalReader, error: Error): void {
        for (const [connectionId, pending] of [...local.pending]) {
            local.pending.delete(connectionId);
            pending.reject(new Error("An error occurred while reading the stream"));
        }
    }

    async release(connectionId: string): Promise<void> {
        const userId = this.connectionUser.get(connectionId);
        const readerId = this.connectionReader.get(connectionId);
        if (!userId || !readerId) {
            return;
        }

        this.connectionUser.delete(connectionId);
        this.connectionReader.delete(connectionId);

        const connections = this.userConnections.get(userId);
        if (connections) {
            connections.delete(connectionId);
            if (connections.size === 0) {
                this.userConnections.delete(userId);
            }
        }

        const local = this.readers.get(readerId);
        if (local) {
            local.connectionIds.delete(connectionId);
            const pending = local.pending.get(connectionId);
            if (pending) {
                local.pending.delete(connectionId);
                pending.resolve([]);
            }
        }

        const clearUserReader =
            !this.userConnections.has(userId) ? '1' : '0';

        const remaining = Number(
            await this.client.eval(
                RELEASE_READER_SCRIPT,
                3,
                SSE_READERS_KEY,
                SSE_READER_COUNTS_KEY,
                sseUserReaderKey(userId),
                readerId,
                clearUserReader,
            ),
        );

        if (remaining <= 0) {
            await this.destroyLocalReader(readerId);
            this.logger.log(`Stopped stream reader ${readerId}`);
        }
    }

    private async destroyLocalReader(readerId: string): Promise<void> {
        const local = this.readers.get(readerId);
        if (!local) {
            return;
        }
        local.closed = true;
        this.rejectAllPending(
            local,
            new Error(`Stream reader ${readerId} closed`),
        );
        local.redis.disconnect();
        this.readers.delete(readerId);
    }
}

function fieldsToRecord(fields: string[]): Record<string, string> {
    const record: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
        record[fields[i]] = fields[i + 1] ?? '';
    }
    return record;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
