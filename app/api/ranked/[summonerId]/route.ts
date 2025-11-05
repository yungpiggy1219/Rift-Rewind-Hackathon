import { NextRequest, NextResponse } from 'next/server';

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const RIOT_REGION = process.env.RIOT_REGION || 'americas';

// Platform mapping for summoner data
const REGION_TO_PLATFORM: { [key: string]: string } = {
  'americas': 'na1',
  'europe': 'euw1', 
  'asia': 'kr',
  'sea': 'oc1'
};

async function riotRequest(url: string): Promise<unknown> {
  if (!RIOT_API_KEY) {
    throw new Error('RIOT_API_KEY is required but not provided');
  }

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ summonerId: string }> }
) {
  try {
    const resolvedParams = await params;
    const summonerId = resolvedParams.summonerId;
    
    // Get platform for this region
    const platform = REGION_TO_PLATFORM[RIOT_REGION] || 'na1';
    
    // Fetch ranked info by summoner ID
    const url = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
    const rankedInfo = await riotRequest(url) as Array<{
      queueType: string;
      tier: string;
      rank: string;
      leaguePoints: number;
      wins: number;
      losses: number;
    }>;
    
    return NextResponse.json(rankedInfo);
  } catch (error) {
    console.error('Ranked API error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch ranked info' },
      { status: 500 }
    );
  }
}