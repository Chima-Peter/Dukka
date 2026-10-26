export const STREAM_READ_BLOCK_MS = 0;
export const STREAM_MAX_LEN = 1_000;
export const STREAM_START_ID = '$';

export type RedisStreamEntry = {
    id: string;
    fields: Record<string, string>;
};
