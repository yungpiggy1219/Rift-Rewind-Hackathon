import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveSummoner } from '@/src/lib/riot';

const SummonerRequestSchema = z.object({
  gameName: z.string().min(1).max(16),
  tagLine: z.string().min(1).max(5)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameName, tagLine } = SummonerRequestSchema.parse(body);

    const account = await resolveSummoner(gameName, tagLine);
    
    return NextResponse.json({
      puuid: account.puuid,
      region: account.region
    });
  } catch (error) {
    console.error('Summoner API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve summoner' },
      { status: 500 }
    );
  }
}