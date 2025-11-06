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

    // Fetch summoner profile by PUUID
    const url = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    const response = await fetch(url, {
      headers: {
        'X-Riot-Token': RIOT_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Riot API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      id: data.id,
      accountId: data.accountId,
      puuid: data.puuid,
      name: data.name,
      profileIconId: data.profileIconId,
      revisionDate: data.revisionDate,
      summonerLevel: data.summonerLevel
    });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch summoner profile' },
      { status: 500 }
    );
  }
}
