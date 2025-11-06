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

    // Fetch ranked info directly using PUUID
    const rankedUrl = `https://${region}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
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
