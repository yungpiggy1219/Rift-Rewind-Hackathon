import { NextRequest, NextResponse } from 'next/server';
import { getAccountByPuuid } from '@/src/lib/riot';

const RIOT_API_KEY = process.env.RIOT_API_KEY;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ puuid: string }> }
) {
  try {
    const { puuid } = await params;

    if (!RIOT_API_KEY) {
      return NextResponse.json(
        { error: 'RIOT_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log(`[Mastery API] Looking up cached account for ${puuid}`);
    
    // Get platform from cached account
    const cachedAccount = await getAccountByPuuid(puuid);
    
    if (!cachedAccount || !cachedAccount.platform) {
      console.log(`[Mastery API] No cached account found for ${puuid}`);
      return NextResponse.json(
        { error: 'Account not found. Please search for the summoner first.' },
        { status: 404 }
      );
    }

    console.log(`[Mastery API] Using platform ${cachedAccount.platform}`);

    // Fetch champion mastery by PUUID
    // Get top mastery champions (by default, returns top champions)
    const url = `https://${cachedAccount.platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=5`;
    console.log(`[Mastery API] Fetching from: ${url}`);
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
