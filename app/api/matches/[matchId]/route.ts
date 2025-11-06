import { NextRequest, NextResponse } from 'next/server';
import { fetchMatchDetail } from '@/src/lib/riot';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const resolvedParams = await params;
    const matchId = resolvedParams.matchId;
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region') || 'americas';

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    console.log(`[matches API] Fetching match ${matchId} from region ${region}`);

    const matchData = await fetchMatchDetail(matchId, undefined, region);

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
