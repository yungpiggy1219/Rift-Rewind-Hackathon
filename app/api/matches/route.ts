import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchMatchIds } from '@/src/lib/riot';

const MatchesRequestSchema = z.object({
  puuid: z.string(),
  queueIds: z.array(z.number()).optional(),
  start: z.number().optional(),
  count: z.number().min(1).max(100).default(20)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { puuid, queueIds, start, count } = MatchesRequestSchema.parse(body);

    const result = await fetchMatchIds(puuid, queueIds, start, count);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Matches API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}