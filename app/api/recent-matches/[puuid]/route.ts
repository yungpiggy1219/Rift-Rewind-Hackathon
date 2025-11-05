import { NextRequest, NextResponse } from 'next/server';

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const RIOT_REGION = process.env.RIOT_REGION || 'americas';

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
    
    // Fetch recent match IDs (last 20 games)
    const matchIdsUrl = `https://${RIOT_REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=20`;
    const matchIds = await riotRequest(matchIdsUrl) as string[];
    
    if (!matchIds || matchIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch details for recent matches (limit to first 10 for performance)
    const recentMatches = [];
    const matchesToFetch = matchIds.slice(0, 10);
    
    for (const matchId of matchesToFetch) {
      try {
        const matchUrl = `https://${RIOT_REGION}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
        const matchData = await riotRequest(matchUrl) as {
          metadata: { matchId: string };
          info: {
            gameCreation: number;
            gameDuration: number;
            gameMode: string;
            participants: Array<{
              puuid: string;
              summonerName?: string;
              riotIdGameName?: string;
              championName: string;
              kills: number;
              deaths: number;
              assists: number;
              win: boolean;
            }>;
          };
        };

        // Transform to our format
        const transformedMatch = {
          gameId: matchData.metadata.matchId,
          gameCreation: matchData.info.gameCreation,
          gameDuration: matchData.info.gameDuration,
          gameMode: matchData.info.gameMode,
          participants: matchData.info.participants.map(p => ({
            summonerName: p.summonerName || p.riotIdGameName || 'Unknown',
            championName: p.championName,
            kills: p.kills,
            deaths: p.deaths,
            assists: p.assists,
            win: p.win
          }))
        };

        recentMatches.push(transformedMatch);
        
        // Rate limiting - small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching match ${matchId}:`, error);
        // Continue with other matches
      }
    }
    
    return NextResponse.json(recentMatches);
  } catch (error) {
    console.error('Recent matches API error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch recent matches' },
      { status: 500 }
    );
  }
}