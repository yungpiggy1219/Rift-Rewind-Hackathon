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

    console.log(`[Ranked API] Looking up cached account for ${puuid}`);
    
    // Get platform from cached account
    const cachedAccount = await getAccountByPuuid(puuid);
    
    if (!cachedAccount || !cachedAccount.platform) {
      console.log(`[Ranked API] No cached account found for ${puuid}`);
      return NextResponse.json(
        { error: 'Account not found. Please search for the summoner first.' },
        { status: 404 }
      );
    }

    console.log(`[Ranked API] Using platform ${cachedAccount.platform}`);

    // Fetch ranked info directly using PUUID
    const rankedUrl = `https://${cachedAccount.platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
    console.log(`[Ranked API] Fetching from: ${rankedUrl}`);
    const rankedResponse = await fetch(rankedUrl, {
      headers: {
        'X-Riot-Token': RIOT_API_KEY
      }
    });

    if (!rankedResponse.ok) {
      throw new Error(`Riot API error: ${rankedResponse.status} ${rankedResponse.statusText}`);
    }

    const data = await rankedResponse.json();
    
    // Transform the data to match our interface
    const rankedInfo = (data as Array<{
      queueType: string;
      tier: string;
      rank: string;
      leaguePoints: number;
      wins: number;
      losses: number;
    }>).map((entry) => ({
      queueType: entry.queueType,
      tier: entry.tier,
      rank: entry.rank,
      leaguePoints: entry.leaguePoints,
      wins: entry.wins,
      losses: entry.losses
    }));

    return NextResponse.json(rankedInfo);
  } catch (error) {
    console.error('Ranked API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch ranked info' },
      { status: 500 }
    );
  }
}
