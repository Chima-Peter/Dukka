export const STREAM_READ_BLOCK_MS = 5_000;
export const STREAM_READ_COUNT = 200;
export const STREAM_MAX_LEN = 1_000;
export const STREAM_START_ID = '$';

export const MAX_SSE_CONNECTIONS_PER_USER = 3;
export const MAX_CONNECTIONS_PER_READER = 100;

export const SSE_READERS_KEY = 'sse:readers';
export const SSE_READER_COUNTS_KEY = 'sse:reader:counts';

export type RedisStreamEntry = {
    id: string;
    fields: Record<string, string>;
};

export type StreamConnectionHandle = {
    readerId: string;
    connectionId: string;
    read(userId: string): Promise<RedisStreamEntry[]>;
    release(): Promise<void>;
};

export function sseUserReaderKey(userId: string): string {
    return `sse:user:${userId}:reader`;
}
