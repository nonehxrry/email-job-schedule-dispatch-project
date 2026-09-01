import { redisClient } from '../config/redis.config';
import { RateLimitCheckResult } from '../types';

export class RateLimiterService {
  /**
   * Generates a deterministic hour window key based on UTC hour:
   * e.g. "rl:sender:outreach@reachinbox.ai:2026-09-01-13"
   */
  private getWindowKey(senderEmail: string, date: Date = new Date()): { key: string; resetTimeMs: number } {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');

    const key = `rl:sender:${senderEmail.toLowerCase().trim()}:${year}-${month}-${day}-${hour}`;

    // Calculate when the NEXT hour window starts in UTC
    const nextHour = new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate(), date.getUTCHours() + 1, 0, 0, 0));
    const resetTimeMs = nextHour.getTime();

    return { key, resetTimeMs };
  }

  /**
   * Checks if an email send is allowed under the hourly limit.
   * If allowed, atomically increments the counter.
   * If limit exceeded, returns allowed: false with the exact next window reset timestamp.
   */
  public async checkAndConsume(senderEmail: string, limitPerHour: number): Promise<RateLimitCheckResult> {
    const now = new Date();
    const { key, resetTimeMs } = this.getWindowKey(senderEmail, now);

    try {
      // Use Redis transaction to atomically increment and ensure TTL
      const pipeline = redisClient.pipeline();
      pipeline.incr(key);
      pipeline.ttl(key);
      const results = await pipeline.exec();

      const count = (results?.[0]?.[1] as number) || 1;
      const ttl = (results?.[1]?.[1] as number) || -1;

      // If key had no TTL (new key), set TTL to 2 hours (7200s)
      if (ttl === -1) {
        await redisClient.expire(key, 7200);
      }

      if (count > limitPerHour) {
        // Exceeded limit: do not allow
        return {
          allowed: false,
          currentCount: count,
          maxLimit: limitPerHour,
          resetTimeMs,
          windowKey: key,
        };
      }

      return {
        allowed: true,
        currentCount: count,
        maxLimit: limitPerHour,
        resetTimeMs,
        windowKey: key,
      };
    } catch (error: any) {
      console.error(`[RateLimiter] Redis check failed: ${error.message}. Allowing request in fallback.`);
      return {
        allowed: true,
        currentCount: 1,
        maxLimit: limitPerHour,
        resetTimeMs,
        windowKey: key,
      };
    }
  }

  /**
   * Gets current count without consuming
   */
  public async getCurrentUsage(senderEmail: string): Promise<{ count: number; resetTimeMs: number }> {
    const { key, resetTimeMs } = this.getWindowKey(senderEmail, new Date());
    try {
      const val = await redisClient.get(key);
      return { count: val ? parseInt(val, 10) : 0, resetTimeMs };
    } catch {
      return { count: 0, resetTimeMs };
    }
  }
}

export const rateLimiterService = new RateLimiterService();
