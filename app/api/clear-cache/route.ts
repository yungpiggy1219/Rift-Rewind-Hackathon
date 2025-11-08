import { NextRequest, NextResponse } from 'next/server';
import * as cache from '@/src/lib/cache';

async function clearCacheForPuuid(puuid: string) {
  const keysCleared: string[] = [];
  let totalCleared = 0;
  
  console.log(`[clear-cache] Starting cache clear for PUUID: ${puuid}`);
  
  // Use pattern matching to clear all cache entries for this PUUID
  const patterns = [
    `*${puuid}*`, // Main pattern - catches everything with the puuid
    `scene:${puuid}:*`, // Scene-specific pattern
    `match-ids-${puuid}*`, // Match IDs pattern
    `narration:*:*:${puuid}`, // Narration pattern
  ];
  
  for (const pattern of patterns) {
    try {
      const count = await cache.clearPattern(pattern);
      totalCleared += count;
      keysCleared.push(`Pattern: ${pattern} (${count} keys)`);
      console.log(`[clear-cache] Cleared ${count} keys matching pattern: ${pattern}`);
    } catch (error) {
      console.error(`[clear-cache] Error clearing pattern ${pattern}:`, error);
    }
  }
  
  // Also explicitly clear known keys for extra safety
  const regions = ['americas', 'europe', 'asia'];
  const queues = ['all', '420', '450'];
  const types = ['all', 'ranked'];
  
  for (const region of regions) {
    for (const queue of queues) {
      for (const type of types) {
        const cacheKey = `match-ids-${puuid}-${region}-${queue}-${type}`;
        await cache.del(cacheKey);
        keysCleared.push(cacheKey);
      }
    }
  }
  
  // Clear scene caches explicitly
  const sceneIds = [
    "year_in_motion", "signature_champion", "signature_position", "damage_share", "damage_taken",
    "total_healed", "gold_share", "vision_score", "growth_over_time", "peak_performance",
    "weaknesses", "best_friend", "aram", "ranked_stats", "killing_spree", 
    "dragon_slayer", "sniper", "fancy_feet", "path_forward",
    "social_comparison", "legacy"
  ];
  
  for (const sceneId of sceneIds) {
    const sceneKey = cache.cacheKeys.scene(puuid, sceneId);
    await cache.del(sceneKey);
    keysCleared.push(sceneKey);
  }
  
  console.log(`[clear-cache] Total cleared: ${totalCleared} keys (including ${keysCleared.length} explicit keys)`);
  
  return NextResponse.json({
    success: true,
    message: `Cleared cache for ${puuid}`,
    totalCleared: totalCleared + keysCleared.length,
    keysCleared
  });
}

async function clearAllCache() {
  const keysCleared: string[] = [];
  let totalCleared = 0;

  console.log(`[clear-cache] Starting cache clear for ALL data`);

  try {
    // Clear all cache using a broad pattern
    const count = await cache.clearPattern('*');
    totalCleared += count;
    keysCleared.push(`Pattern: * (${count} keys)`);
    console.log(`[clear-cache] Cleared ${count} keys matching pattern: *`);
  } catch (error) {
    console.error(`[clear-cache] Error clearing all cache:`, error);
  }

  console.log(`[clear-cache] Total cleared: ${totalCleared} keys`);

  return NextResponse.json({
    success: true,
    message: `Cleared all cache`,
    totalCleared,
    keysCleared
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const puuid = searchParams.get('puuid');
    
    if (!puuid) {
      // If no PUUID provided, clear all cache
      return clearAllCache();
    }

    return clearCacheForPuuid(puuid);
  } catch (error) {
    console.error('[clear-cache] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear cache' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const puuid = searchParams.get('puuid');
    
    if (!puuid) {
      // If no PUUID provided, clear all cache
      return clearAllCache();
    }

    return clearCacheForPuuid(puuid);
    
  } catch (error) {
    console.error('[clear-cache] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear cache' },
      { status: 500 }
    );
  }
}