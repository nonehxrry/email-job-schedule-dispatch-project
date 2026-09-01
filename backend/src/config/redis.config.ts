import Redis, { RedisOptions } from 'ioredis';
import RedisMock from 'ioredis-mock';
import { env } from './env.config';

export let isMockRedis = false;

export const redisConnectionOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 3) return null; // stop reconnecting after 3 tries and switch to mock
    return Math.min(times * 100, 1000);
  },
};

// Create client instance with lazyConnect to prevent immediate uncaught connection errors
export let redisClient: Redis = new Redis(redisConnectionOptions);

// Prevent unhandled node error crashes
redisClient.on('error', (err) => {
  // Silent warning for connection retries
});

export async function initRedis(): Promise<Redis> {
  try {
    await redisClient.connect();
    const pong = await redisClient.ping();
    console.log(`[Redis] ✅ Connected to Redis server at ${env.REDIS_HOST}:${env.REDIS_PORT} (ping: ${pong})`);
    isMockRedis = false;
    return redisClient;
  } catch (error: any) {
    console.warn(`[Redis] ⚠️ Could not reach Redis on ${env.REDIS_HOST}:${env.REDIS_PORT}. Initializing resilient in-memory Redis engine...`);
    
    // Replace with in-memory mock client that supports BullMQ & Rate Limiter commands
    const mockClient = new RedisMock();
    redisClient = mockClient as unknown as Redis;
    isMockRedis = true;
    console.log(`[Redis] ✅ Resilient In-Memory Redis Engine active and ready for BullMQ.`);
    return redisClient;
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {}
  }
}
