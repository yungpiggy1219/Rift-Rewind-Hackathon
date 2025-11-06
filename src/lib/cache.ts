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

// In-memory cache for development (fallback)
const memoryCache = new Map<string, { data: any; expires: number }>();

// File-based cache directory (server-side only)
const isServer = typeof window === 'undefined';
let CACHE_DIR: string | null = null;
let fs: any = null;
let path: any = null;

// Initialize file system cache only on server
if (isServer) {
  try {
    fs = require('fs');
    path = require('path');
    CACHE_DIR = path.join(process.cwd(), '.cache');
    
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      console.log(`[cache] Created cache directory at ${CACHE_DIR}`);
    }
    console.log(`[cache] File cache initialized at ${new Date().toISOString()}`);
    console.log(`[cache] Cache directory: ${CACHE_DIR}`);
  } catch (error) {
    console.warn('[cache] Failed to initialize file cache:', error);
    CACHE_DIR = null;
  }
}

// Cache TTL in seconds
const DEFAULT_TTL = 300; // 5 minutes
const LONG_TTL = 3600; // 1 hour

export async function get(key: string): Promise<any> {
  try {
    if (redis) {
      const value = await redis.get(key);
      if (value) {
        console.log(`Redis cache hit for ${key}`);
        return typeof value === 'string' ? JSON.parse(value) : value;
      }
      console.log(`Redis cache miss for ${key}`);
      return null;
    } else {
      // Try file-based cache first (server-side only)
      if (isServer && fs && path && CACHE_DIR) {
        try {
          const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
          const filePath = path.join(CACHE_DIR, `${safeKey}.json`);
          
          if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const cached = JSON.parse(fileContent);
            
            if (cached.expires > Date.now()) {
              console.log(`File cache hit for ${key}`);
              return cached.data;
            } else {
              console.log(`File cache expired for ${key}`);
              fs.unlinkSync(filePath);
              return null;
            }
          }
        } catch (fileError) {
          console.warn(`File cache read error for ${key}:`, fileError);
        }
      }
      
      // Fall back to memory cache
      console.log(`[cache.get] Looking for key: ${key}. Memory cache has ${memoryCache.size} entries`);
      const cached = memoryCache.get(key);
      if (cached && cached.expires > Date.now()) {
        console.log(`Memory cache hit for ${key}`);
        return cached.data;
      }
      if (cached && cached.expires <= Date.now()) {
        console.log(`Memory cache expired for ${key}`);
        memoryCache.delete(key);
      } else {
        console.log(`Cache miss for ${key}`);
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
      console.log(`[cache.set] Storing in Redis: ${key} (TTL: ${ttl}s)`);
      await redis.setex(key, ttl, JSON.stringify(value));
    } else {
      // File-based cache (server-side only)
      if (isServer && fs && path && CACHE_DIR) {
        try {
          const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
          const filePath = path.join(CACHE_DIR, `${safeKey}.json`);
          const cacheData = {
            data: value,
            expires: Date.now() + (ttl * 1000)
          };
          
          fs.writeFileSync(filePath, JSON.stringify(cacheData), 'utf-8');
          console.log(`[cache.set] Stored in file: ${key} (TTL: ${ttl}s) at ${filePath}`);
        } catch (fileError) {
          console.warn(`File cache write error for ${key}:`, fileError);
        }
      }
      
      // Also store in memory for faster access
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
  summoner: (gameName: string, tagLine: string) => `summoner:${gameName.toLowerCase()}:${tagLine.toLowerCase()}`,
  summonerByPuuid: (puuid: string) => `summoner:puuid:${puuid}`,
  matches: (puuid: string) => `matches:${puuid}:2025`,
  aggregates: (puuid: string) => `aggregates:${puuid}:2025`,
  scene: (puuid: string, sceneId: string) => `scene:${puuid}:${sceneId}:2025`,
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