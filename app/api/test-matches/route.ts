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

    // Calculate season timestamps
    const seasonYear = parseInt(season);
    const startTimestamp = new Date(`${seasonYear}-01-01T00:00:00Z`).getTime();
    const endTimestamp = new Date(`${seasonYear}-12-31T23:59:59Z`).getTime();

    console.log(`[test-matches] Season range: ${startTimestamp} to ${endTimestamp}`);

    // Fetch all match IDs
    const allMatchIds: string[] = [];
    let start = 0;
    const batchSize = 100;
    const maxBatches = 20;
    let batchCount = 0;

    while (batchCount < maxBatches) {
      console.log(`[test-matches] Fetching batch ${batchCount + 1} at start=${start}`);
      
      const path = `/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${batchSize}&start=${start}`;
      const ids = await riotRequest(path) as string[];
      
      console.log(`[test-matches] Batch ${batchCount + 1}: Got ${ids.length} match IDs`);

      if (ids.length === 0) {
        console.log(`[test-matches] No more matches, stopping`);
        break;
      }

      allMatchIds.push(...ids);
      batchCount++;

      if (ids.length < batchSize) {
        console.log(`[test-matches] Got fewer than ${batchSize} matches, reached end`);
        break;
      }

      start += ids.length;
    }

    console.log(`[test-matches] FINAL RESULT: ${allMatchIds.length} total match IDs fetched`);

    return NextResponse.json({
      success: true,
      puuid,
      season,
      totalMatchIds: allMatchIds.length,
      matchIds: allMatchIds.slice(0, 10), // Show first 10 IDs as sample
      note: 'Only counting match IDs, not fetching details to avoid rate limits'
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
