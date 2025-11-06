import { NextRequest, NextResponse } from 'next/server';
import * as cache from '@/src/lib/cache';

const RIOT_API_KEY = process.env.RIOT_API_KEY!;
const RIOT_REGION = process.env.RIOT_REGION || 'americas';

async function riotRequest(path: string) {
  const url = `https://${RIOT_REGION}.api.riotgames.com${path}`;
  console.log(`[test-matches] Fetching: ${url}`);

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

    // Check shared cache first
    const cacheKey = `match-ids-${puuid}-${queue || 'all'}-${type || 'all'}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      console.log(`[test-matches] Returning cached match IDs for ${puuid}: ${(cached as any).matchIds.length} matches`);
      return NextResponse.json(cached);
    }

    // Time range: Jan 1, 2025 → Nov 5, 2025 (in seconds)
    const startTimestamp = 1735689600; // January 1st, 2025 00:00:00 UTC
    const endTimestamp = 1762387199;   // November 5th, 2025 23:59:59 UTC

    console.log(
      `[test-matches] Season range: ${new Date(startTimestamp * 1000).toISOString()} → ${new Date(endTimestamp * 1000).toISOString()}`
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
      console.log(`[test-matches] Fetching batch ${batchCount} (start=${start})`);

      const ids = (await riotRequest(path)) as string[];
      console.log(`[test-matches] Batch ${batchCount}: got ${ids.length} IDs`);

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

    // Cache the results in shared cache
    await cache.set(cacheKey, result);

    console.log(`[test-matches] Final: ${uniqueMatchIds.length} unique match IDs cached`);
    console.log(`[test-matches] All match IDs:`, uniqueMatchIds);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[test-matches] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch match history',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
