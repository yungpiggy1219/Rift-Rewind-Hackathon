import { NextRequest, NextResponse } from 'next/server';
import { sceneRegistry } from '@/src/lib/sceneRegistry';
import * as cache from '@/src/lib/cache';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  try {
    const { sceneId } = await params;
    const body = await request.json();
    const { puuid } = body;

    if (!puuid) {
      return NextResponse.json(
        { error: 'PUUID is required' },
        { status: 400 }
      );
    }

    console.log(`[Insights API] Computing scene: ${sceneId} for ${puuid}`);

    // Get the scene definition
    const scene = sceneRegistry[sceneId as keyof typeof sceneRegistry];
    console.log(`[Insights API] Scene lookup result:`, {
      sceneId,
      found: !!scene,
      availableScenes: Object.keys(sceneRegistry)
    });
    
    if (!scene) {
      console.error(`[Insights API] Scene not found: ${sceneId}`);
      return NextResponse.json(
        { 
          error: `Scene '${sceneId}' not found`,
          availableScenes: Object.keys(sceneRegistry)
        },
        { status: 404 }
      );
    }

    // Check cache first
    const cacheKey = cache.cacheKeys.scene(puuid, sceneId);
    const cachedResult = await cache.get(cacheKey);
    
    if (cachedResult) {
      console.log(`[Insights API] Cache hit for scene ${sceneId}`);
      return NextResponse.json(cachedResult);
    }

    console.log(`[Insights API] Cache miss for scene ${sceneId}, computing...`);

    // Get match IDs from cache - need to use the same key format as match-ids API
    // Try to get region from cached account first
    const cachedAccount = await cache.get(`summoner:puuid:${puuid}`);
    const region = cachedAccount?.region || process.env.RIOT_REGION || 'americas';
    
    const matchIdsCacheKey = `match-ids-${puuid}-${region}-all-all`;
    console.log(`[Insights API] Looking for match IDs with key: ${matchIdsCacheKey}`);
    
    const matchIdsData = await cache.get(matchIdsCacheKey) as { 
      totalMatches: number; 
      matchIds: string[];
      matches?: string[]; // Some cached data might use 'matches' instead
    } | null;
    
    if (!matchIdsData) {
      console.error(`[Insights API] No match IDs found in cache for ${puuid}`);
      return NextResponse.json(
        { error: 'No match data found. Please fetch matches first from the menu page.' },
        { status: 404 }
      );
    }
    
    // Handle both possible field names
    const matchIds = matchIdsData.matchIds || matchIdsData.matches || [];
    
    if (matchIds.length === 0) {
      console.error(`[Insights API] Match IDs array is empty for ${puuid}`);
      return NextResponse.json(
        { error: 'No match data found. Please fetch matches first from the menu page.' },
        { status: 404 }
      );
    }

    console.log(`[Insights API] Found ${matchIds.length} match IDs for computation`);

    // Compute the scene data
    const result = await scene.compute({
      puuid,
      matchIds: matchIds
    });

    // Cache the result for 1 hour
    await cache.setLong(cacheKey, result);
    console.log(`[Insights API] Computed and cached scene ${sceneId}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Insights API] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to compute scene',
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}
