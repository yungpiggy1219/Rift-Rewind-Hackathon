import { NextRequest, NextResponse } from 'next/server';

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const RIOT_REGION = process.env.RIOT_REGION || 'americas';

async function riotRequest(path: string): Promise<unknown> {
  if (!RIOT_API_KEY) {
    throw new Error('RIOT_API_KEY is required but not provided');
  }

  const url = `https://${RIOT_REGION}.api.riotgames.com${path}`;
  console.log(`[test-matches] Fetching: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'X-Riot-Token': RIOT_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Riot API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const puuid = searchParams.get('puuid');
    const season = searchParams.get('season') || '2025';

    if (!puuid) {
      return NextResponse.json({ error: 'PUUID is required' }, { status: 400 });
    }

    console.log(`[test-matches] Starting fetch for PUUID: ${puuid}, Season: ${season}`);

    // Calculate season timestamps (January 1, 2025 to November 5, 2025)
    const startTimestamp = 1735689600; // January 1st, 2025 00:00:00 UTC in seconds
    const endTimestamp = 1762387199; // November 5th, 2025 23:59:59 UTC in seconds

    console.log(`[test-matches] Season range: ${new Date(startTimestamp * 1000).toISOString()} to ${new Date(endTimestamp * 1000).toISOString()}`);

    // Fetch all match IDs
    const allMatchIds: string[] = [];
    let start = 0;
    const batchSize = 100;
    let batchCount = 0;

    while (true) {
      batchCount++;
      console.log(`[test-matches] Test: Fetching batch ${batchCount} at start=${start}`);
      
      const path = `/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${batchSize}&start=${start}`;
      const ids = await riotRequest(path) as string[];
      
      console.log(`[test-matches] Batch ${batchCount}: Got ${ids.length} match IDs`);

      if (ids.length === 0) {
        console.log(`[test-matches] No more matches, stopping`);
        break;
      }

      allMatchIds.push(...ids);

      if (ids.length < batchSize) {
        console.log(`[test-matches] Got fewer than ${batchSize} matches, reached end`);
        break;
      }

      start += ids.length;
    }

    // Remove duplicates (though Riot API shouldn't return duplicates)
    const uniqueMatchIds = [...new Set(allMatchIds)];

    // Store as comma-separated string
    const matchesString = uniqueMatchIds.join(',');

    console.log(`[test-matches] FINAL RESULT: ${uniqueMatchIds.length} unique match IDs collected`);

    return NextResponse.json({
      success: true,
      puuid,
      season,
      totalMatches: uniqueMatchIds.length,
      matchesString,
      duplicatesRemoved: allMatchIds.length - uniqueMatchIds.length,
      note: `All match IDs stored as comma-separated string, ${uniqueMatchIds.length} unique matches found`
    });
  } catch (error) {
    console.error('[test-matches] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch match history',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
