import { NextRequest, NextResponse } from 'next/server';
import * as cache from '@/src/lib/cache';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const puuid = searchParams.get('puuid');
    
    if (!puuid) {
      return NextResponse.json({ error: 'PUUID is required' }, { status: 400 });
    }

    // Clear match-ids cache for all regions and queue types
    const regions = ['americas', 'europe', 'asia'];
    const queues = ['all', '420', '450']; // ranked, aram, etc.
    const types = ['all', 'ranked'];
    
    const keysCleared: string[] = [];
    
    for (const region of regions) {
      for (const queue of queues) {
        for (const type of types) {
          const cacheKey = `match-ids-${puuid}-${region}-${queue}-${type}`;
          await cache.del(cacheKey);
          keysCleared.push(cacheKey);
        }
      }
    }
    
    // Also clear scene caches that depend on match data
    const sceneIds = [
      "year_in_motion", "signature_style", "growth_over_time", "peak_performance",
      "weaknesses", "allies", "aram", "social_comparison", "legacy", "path_forward"
    ];
    
    for (const sceneId of sceneIds) {
      const sceneKey = cache.cacheKeys.scene(puuid, sceneId);
      await cache.del(sceneKey);
      keysCleared.push(sceneKey);
    }
    
    console.log(`[clear-cache] Cleared ${keysCleared.length} cache keys for ${puuid}`);
    
    return NextResponse.json({
      success: true,
      message: `Cleared ${keysCleared.length} cache keys`,
      keysCleared
    });
    
  } catch (error) {
    console.error('[clear-cache] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear cache' },
      { status: 500 }
    );
  }
}