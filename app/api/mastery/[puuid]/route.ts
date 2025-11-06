import { NextRequest, NextResponse } from 'next/server';

const RIOT_API_KEY = process.env.RIOT_API_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: { puuid: string } }
) {
  try {
    const { puuid } = params;
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region') || 'americas';

    if (!RIOT_API_KEY) {
      return NextResponse.json(
        { error: 'RIOT_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Fetch champion mastery by PUUID
    // Get top mastery champions (by default, returns top champions)
    const url = `https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=5`;
    const response = await fetch(url, {
      headers: {
        'X-Riot-Token': RIOT_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Riot API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform the data to match our interface
    const masteryData = (data as Array<{
      championId: number;
      championLevel: number;
      championPoints: number;
      lastPlayTime: number;
      championPointsSinceLastLevel: number;
      championPointsUntilNextLevel: number;
      chestGranted: boolean;
      tokensEarned: number;
    }>).map((mastery) => ({
      championId: mastery.championId,
      championLevel: mastery.championLevel,
      championPoints: mastery.championPoints,
      lastPlayTime: mastery.lastPlayTime,
      championPointsSinceLastLevel: mastery.championPointsSinceLastLevel,
      championPointsUntilNextLevel: mastery.championPointsUntilNextLevel,
      chestGranted: mastery.chestGranted,
      tokensEarned: mastery.tokensEarned
    }));

    return NextResponse.json(masteryData);
  } catch (error) {
    console.error('Mastery API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch champion mastery' },
      { status: 500 }
    );
  }
}
