import Redis, { RedisOptions } from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';
import { env } from './env.config';

let memoryRedisServer: RedisMemoryServer | null = null;

export let redisConnectionOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    return Math.min(times * 100, 2000);
  },
};

export let redisClient: Redis = new Redis(redisConnectionOptions);

export function getRedisClient(): Redis {
  return redisClient;
}

export async function initRedis(): Promise<Redis> {
  // 1. First test if external Redis is already running on port 6379
  try {
    const testClient = new Redis({
      ...redisConnectionOptions,
      connectTimeout: 1500,
    });
    testClient.on('error', () => {});
    await testClient.connect();
    await testClient.ping();
    console.log(`[Redis] ✅ Connected to existing Redis server at ${env.REDIS_HOST}:${env.REDIS_PORT}`);
    redisClient = testClient;
    return redisClient;
  } catch (e) {
    // 2. If not running, start the real embedded Redis server on port 6379
    console.log(`[Redis] 🚀 Launching real embedded Redis server on port ${env.REDIS_PORT}...`);
    try {
      memoryRedisServer = new RedisMemoryServer({
        instance: {
          port: env.REDIS_PORT,
        },
      });

      await memoryRedisServer.start();
      const host = await memoryRedisServer.getHost();
      const port = await memoryRedisServer.getPort();

      redisConnectionOptions = {
        host,
        port,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      };

      redisClient = new Redis(redisConnectionOptions);
      redisClient.on('error', (err) => console.error('[Redis Error]:', err.message));
      await redisClient.ping();
      console.log(`[Redis] ✅ Real Redis engine running on ${host}:${port} (BullMQ & Lua scripts fully supported)`);
      return redisClient;
    } catch (embeddedErr: any) {
      console.error(`[Redis] Failed to start embedded Redis: ${embeddedErr.message}`);
      return redisClient;
    }
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {}
  }
  if (memoryRedisServer) {
    try {
      await memoryRedisServer.stop();
    } catch {}
  }
}
