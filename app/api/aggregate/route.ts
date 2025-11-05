import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { computeAggregates } from '@/src/lib/riot';

const AggregateRequestSchema = z.object({
  puuid: z.string(),
  season: z.string().default('2025')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { puuid, season } = AggregateRequestSchema.parse(body);

    const aggregates = await computeAggregates(puuid, season);
    
    return NextResponse.json(aggregates);
  } catch (error) {
    console.error('Aggregate API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute aggregates' },
      { status: 500 }
    );
  }
}