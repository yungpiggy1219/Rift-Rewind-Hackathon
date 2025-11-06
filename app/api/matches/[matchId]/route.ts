import { NextRequest, NextResponse } from 'next/server';
import { fetchMatchDetail } from '@/src/lib/riot';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const resolvedParams = await params;
    const matchId = resolvedParams.matchId;

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    console.log(`[matches API] Fetching match ${matchId}`);

    const matchData = await fetchMatchDetail(matchId);

    if (!matchData) {
      console.error(`[matches API] Match ${matchId} returned null - not found or API error`);
      return NextResponse.json(
        { error: 'Match not found or API error' },
        { status: 404 }
      );
    }

    console.log(`[matches API] Successfully fetched match ${matchId}`);
    return NextResponse.json(matchData);
  } catch (error) {
    console.error(`[matches API] Error fetching match:`, {
      matchId: (await params).matchId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch match details',
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}
