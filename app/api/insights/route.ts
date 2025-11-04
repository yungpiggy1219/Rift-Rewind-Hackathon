import { NextRequest, NextResponse } from 'next/server';
import { RiotApiService } from '@/lib/services/riotApi';
import { StatsAggregator } from '@/lib/services/statsAggregator';
import { BedrockService } from '@/lib/services/bedrockService';
import { InsightsResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const summonerName = searchParams.get('summonerName');
    const matchCount = parseInt(searchParams.get('matchCount') || '20', 10);

    if (!summonerName) {
      return NextResponse.json<InsightsResponse>(
        {
          success: false,
          error: 'Summoner name is required',
        },
        { status: 400 }
      );
    }

    // Validate API key
    if (!process.env.RIOT_API_KEY) {
      return NextResponse.json<InsightsResponse>(
        {
          success: false,
          error: 'Riot API key not configured',
        },
        { status: 500 }
      );
    }

    // Initialize services
    const riotApi = new RiotApiService();
    const bedrockService = new BedrockService();

    // Fetch player data
    console.log(`Fetching data for summoner: ${summonerName}`);
    const puuid = await riotApi.getPUUID(summonerName);
    
    console.log(`Fetching match history (${matchCount} matches)`);
    const matches = await riotApi.getMatchHistory(puuid, matchCount);

    if (matches.length === 0) {
      return NextResponse.json<InsightsResponse>(
        {
          success: false,
          error: 'No match history found for this summoner',
        },
        { status: 404 }
      );
    }

    // Aggregate stats
    console.log(`Aggregating stats from ${matches.length} matches`);
    const stats = StatsAggregator.aggregateStats(matches, puuid);

    // Generate AI recap
    console.log('Generating AI recap');
    const aiRecap = await bedrockService.generateRecap(stats, summonerName);

    return NextResponse.json<InsightsResponse>({
      success: true,
      stats,
      aiRecap,
    });
  } catch (error) {
    console.error('Error in /api/insights:', error);
    const err = error as { message?: string };
    return NextResponse.json<InsightsResponse>(
      {
        success: false,
        error: err.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { summonerName, matchCount = 20 } = body;

    if (!summonerName) {
      return NextResponse.json<InsightsResponse>(
        {
          success: false,
          error: 'Summoner name is required',
        },
        { status: 400 }
      );
    }

    // Validate API key
    if (!process.env.RIOT_API_KEY) {
      return NextResponse.json<InsightsResponse>(
        {
          success: false,
          error: 'Riot API key not configured',
        },
        { status: 500 }
      );
    }

    // Initialize services
    const riotApi = new RiotApiService();
    const bedrockService = new BedrockService();

    // Fetch player data
    const puuid = await riotApi.getPUUID(summonerName);
    const matches = await riotApi.getMatchHistory(puuid, matchCount);

    if (matches.length === 0) {
      return NextResponse.json<InsightsResponse>(
        {
          success: false,
          error: 'No match history found for this summoner',
        },
        { status: 404 }
      );
    }

    // Aggregate stats
    const stats = StatsAggregator.aggregateStats(matches, puuid);

    // Generate AI recap
    const aiRecap = await bedrockService.generateRecap(stats, summonerName);

    return NextResponse.json<InsightsResponse>({
      success: true,
      stats,
      aiRecap,
    });
  } catch (error) {
    console.error('Error in /api/insights:', error);
    const err = error as { message?: string };
    return NextResponse.json<InsightsResponse>(
      {
        success: false,
        error: err.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
