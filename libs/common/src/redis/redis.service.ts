import { randomBytes } from 'node:crypto';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.module-definition.js';

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
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
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
    const result = await this.client.eval(LOCK_SCRIPT, 1, key, token, ttlMs);

    return result === 'OK' ? token : null;
  }

  /**
   * Releases a lock only if `token` still owns it (Lua compare-and-delete).
   */
  async unlock(key: string, token: string): Promise<boolean> {
    const result = await this.client.eval(UNLOCK_SCRIPT, 1, key, token);
    return result === 1;
  }
}
