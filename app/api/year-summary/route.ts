import { NextRequest, NextResponse } from 'next/server';
import { generateYearEndSummary } from '@/lib/aws-bedrock';
import { mockPlayerInsights } from '@/lib/mockData';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    
    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    // Generate AI-powered year-end summary
    const summary = await generateYearEndSummary(mockPlayerInsights);
    
    return NextResponse.json({
      playerId,
      summary,
      data: mockPlayerInsights.yearEndSummary
    });
  } catch (error) {
    console.error('Error generating year-end summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}