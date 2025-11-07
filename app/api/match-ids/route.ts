import { NextRequest, NextResponse } from 'next/server';
import * as cache from '@/src/lib/cache';
import { getAccountByPuuid } from '@/src/lib/riot';

const RIOT_API_KEY = process.env.RIOT_API_KEY!;
const RIOT_REGION = process.env.RIOT_REGION || 'americas';

async function riotRequest(path: string, region: string = RIOT_REGION) {
  const url = `https://${region}.api.riotgames.com${path}`;
  console.log(`[match-ids] Fetching: ${url}`);

  const res = await fetch(url, { headers: { 'X-Riot-Token': RIOT_API_KEY } });
  if (!res.ok) throw new Error(`Riot API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const puuid = searchParams.get('puuid');
    const queue = searchParams.get('queue'); // optional, e.g. 450 for ARAM
    const type = searchParams.get('type');   // optional, e.g. 'ranked'

    if (!puuid) {
      return NextResponse.json({ error: 'PUUID is required' }, { status: 400 });
    }

    // Try to get region from cached account
    const cachedAccount = await getAccountByPuuid(puuid);
    const region = cachedAccount?.region || RIOT_REGION;
    
    console.log(`[match-ids] Using region: ${region} for ${puuid}`);

    // Check shared cache first
    const cacheKey = `match-ids-${puuid}-${region}-${queue || 'all'}-${type || 'all'}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      console.log(`[match-ids] Returning cached match IDs for ${puuid}: ${(cached as { matchIds: string[] }).matchIds.length} matches`);
      return NextResponse.json(cached);
    }

    // Time range: Jan 1, 2025 → Current time (in seconds)
    const startTimestamp = 1735689600; // January 1st, 2025 00:00:00 UTC
    const endTimestamp = Math.floor(Date.now() / 1000); // Current time

    console.log(
      `[match-ids] Season range: ${new Date(startTimestamp * 1000).toISOString()} → ${new Date(endTimestamp * 1000).toISOString()}`
    );

    const allMatchIds: string[] = [];
    let start = 0;
    const batchSize = 100;
    let batchCount = 0;

    while (true) {
      batchCount++;

      const params = new URLSearchParams({
        start: String(start),
        count: String(batchSize),
        startTime: String(startTimestamp),
        endTime: String(endTimestamp),
      });

      if (queue) params.set('queue', queue);
      if (type) params.set('type', type);

      const path = `/lol/match/v5/matches/by-puuid/${puuid}/ids?${params.toString()}`;
      console.log(`[match-ids] Fetching batch ${batchCount} (start=${start})`);

      const ids = (await riotRequest(path, region)) as string[];
      console.log(`[match-ids] Batch ${batchCount}: got ${ids.length} IDs`);

      if (ids.length === 0) break;

      allMatchIds.push(...ids);
      if (ids.length < batchSize) break;

      start += ids.length;
    }

    const uniqueMatchIds = [...new Set(allMatchIds)];

    const result = {
      success: true,
      puuid,
      totalMatches: uniqueMatchIds.length,
      matches: uniqueMatchIds,
      matchIds: uniqueMatchIds, // Also include as matchIds for compatibility
      duplicatesRemoved: allMatchIds.length - uniqueMatchIds.length,
      cached: false,
      note: `Filtered by time range (2025-01-01 → now${queue ? `, queue=${queue}` : ''}${type ? `, type=${type}` : ''})`,
    };

    // Cache the results in shared cache with long TTL (1 hour) for recap session
    await cache.setLong(cacheKey, result);

    console.log(`[match-ids] Final: ${uniqueMatchIds.length} unique match IDs cached`);
    console.log(`[match-ids] All match IDs:`, uniqueMatchIds);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[match-ids] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch match history',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
