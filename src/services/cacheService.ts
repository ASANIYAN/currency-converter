import { getRedisClient } from "../config/redis";
import config from "../config/env";

export interface CachedRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  source: string;
  timestamp: string;
}

export class CacheService {
  private ttl: number;

  constructor() {
    this.ttl = config.cache.ttlSeconds;
  }

  private getCacheKey(base: string, target: string): string {
    return `rate:${base.toUpperCase()}:${target.toUpperCase()}`;
  }

  async setRate(
    baseCurrency: string,
    targetCurrency: string,
    rate: number,
    source: string
  ): Promise<void> {
    const redis = getRedisClient();
    const key = this.getCacheKey(baseCurrency, targetCurrency);

    const data: CachedRate = {
      baseCurrency: baseCurrency.toUpperCase(),
      targetCurrency: targetCurrency.toUpperCase(),
      rate,
      source,
      timestamp: new Date().toISOString(),
    };

    await redis.setex(key, this.ttl, JSON.stringify(data));
  }

  async getRate(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<CachedRate | null> {
    const redis = getRedisClient();
    const key = this.getCacheKey(baseCurrency, targetCurrency);

    const cached = await redis.get(key);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as CachedRate;
  }

  async hasRate(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<boolean> {
    const redis = getRedisClient();
    const key = this.getCacheKey(baseCurrency, targetCurrency);

    const exists = await redis.exists(key);
    return exists === 1;
  }

  async getTTL(baseCurrency: string, targetCurrency: string): Promise<number> {
    const redis = getRedisClient();
    const key = this.getCacheKey(baseCurrency, targetCurrency);

    return await redis.ttl(key);
  }

  async deleteRate(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<void> {
    const redis = getRedisClient();
    const key = this.getCacheKey(baseCurrency, targetCurrency);

    await redis.del(key);
  }

  async clearAll(): Promise<void> {
    const redis = getRedisClient();

    const keys = await redis.keys("rate:*");

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export const cacheService = new CacheService();
