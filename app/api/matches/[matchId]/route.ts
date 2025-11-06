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
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(matchData);
  } catch (error) {
    console.error('[matches API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch match details' },
      { status: 500 }
    );
  }
}
