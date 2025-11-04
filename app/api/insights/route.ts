import { NextRequest, NextResponse } from 'next/server';
import { generateInsights } from '@/lib/aws-bedrock';
import { mockMatches, mockPlayerInsights } from '@/lib/mockData';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    
    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    // For now, return mock data
    // In production, you'd fetch real data from Riot API
    const insights = mockPlayerInsights;
    
    // Generate AI insights using AWS Bedrock
    const aiInsights = await generateInsights(mockMatches);
    
    return NextResponse.json({
      ...insights,
      aiGeneratedInsights: aiInsights
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchData } = body;
    
    if (!matchData) {
      return NextResponse.json({ error: 'Match data is required' }, { status: 400 });
    }

    const insights = await generateInsights(matchData);
    
    return NextResponse.json({ insights });
  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}