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
    
    // Fetch champion mastery by summoner ID
    const url = `https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-summoner/${summonerId}`;
    const mastery = await riotRequest(url) as Array<{
      championId: number;
      championLevel: number;
      championPoints: number;
      lastPlayTime: number;
      championPointsSinceLastLevel: number;
      championPointsUntilNextLevel: number;
      chestGranted: boolean;
      tokensEarned: number;
    }>;
    
    return NextResponse.json(mastery);
  } catch (error) {
    console.error('Mastery API error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch champion mastery' },
      { status: 500 }
    );
  }
}