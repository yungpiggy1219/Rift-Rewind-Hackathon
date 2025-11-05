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
  { params }: { params: Promise<{ puuid: string }> }
) {
  try {
    const resolvedParams = await params;
    const puuid = resolvedParams.puuid;
    
    // Get platform for this region
    const platform = REGION_TO_PLATFORM[RIOT_REGION] || 'na1';
    
    // Fetch summoner profile by PUUID
    const url = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    console.log('Fetching profile from:', url);
    const profile = await riotRequest(url) as {
      id: string;
      accountId: string;
      puuid: string;
      name: string;
      profileIconId: number;
      revisionDate: number;
      summonerLevel: number;
    };
    
    return NextResponse.json(profile);
  } catch (error) {
    console.error('Profile API error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}