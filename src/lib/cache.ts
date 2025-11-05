import { Redis } from '@upstash/redis';

// Optional Redis client - falls back to in-memory if not configured
let redis: Redis | null = null;

try {
  if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
    redis = new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN,
    });
  }
} catch (error) {
  console.warn('Redis not configured, using in-memory cache');
}

// In-memory fallback cache
const memoryCache = new Map<string, { data: any; expires: number }>();

// Cache TTL in seconds
const DEFAULT_TTL = 300; // 5 minutes
const LONG_TTL = 3600; // 1 hour

export async function get<T>(key: string): Promise<T | null> {
  try {
    if (redis) {
      const result = await redis.get(key);
      return result as T;
    } else {
      // In-memory fallback
      const cached = memoryCache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.data as T;
      }
      if (cached) {
        memoryCache.delete(key);
      }
      return null;
    }
  } catch (error) {
    console.warn('Cache get error:', error);
    return null;
  }
}

export async function set(key: string, value: any, ttl: number = DEFAULT_TTL): Promise<void> {
  try {
    if (redis) {
      await redis.setex(key, ttl, JSON.stringify(value));
    } else {
      // In-memory fallback
      memoryCache.set(key, {
        data: value,
        expires: Date.now() + (ttl * 1000)
      });
    }
  } catch (error) {
    console.warn('Cache set error:', error);
  }
}

export async function del(key: string): Promise<void> {
  try {
    if (redis) {
      await redis.del(key);
    } else {
      memoryCache.delete(key);
    }
  } catch (error) {
    console.warn('Cache delete error:', error);
  }
}

// Cache key builders
export const cacheKeys = {
  summoner: (gameName: string, tagLine: string) => `summoner:${gameName}:${tagLine}`,
  matches: (puuid: string, season: string) => `matches:${puuid}:${season}`,
  aggregates: (puuid: string, season: string) => `aggregates:${puuid}:${season}`,
  scene: (puuid: string, sceneId: string, season: string) => `scene:${puuid}:${sceneId}:${season}`,
  narration: (agentId: string, sceneId: string, puuid: string) => `narration:${agentId}:${sceneId}:${puuid}`,
};

// Cache with longer TTL for expensive operations
export async function setLong(key: string, value: any): Promise<void> {
  return set(key, value, LONG_TTL);
}

// Cleanup expired in-memory cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of memoryCache.entries()) {
    if (cached.expires <= now) {
      memoryCache.delete(key);
    }
  }
}, 60000); // Clean up every minute