import { NextRequest, NextResponse } from 'next/server';
import { generateYearEndSummary } from '@/lib/aws-bedrock';
import { riotAPI } from '@/lib/riot-api';
import { MatchAnalyzer } from '@/lib/match-analyzer';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    
    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    // Parse gameName and tagLine from playerId (format: gameName#tagLine)
    const [gameName, tagLine] = playerId.split('#');
    if (!gameName || !tagLine) {
      return NextResponse.json({ error: 'Invalid player ID format. Expected: gameName#tagLine' }, { status: 400 });
    }

    // Check if Riot API key is configured
    if (!process.env.RIOT_API_KEY) {
      return NextResponse.json({ 
        error: 'Riot API key is not configured. Please add RIOT_API_KEY to your .env.local file.' 
      }, { status: 500 });
    }

    // Fetch player data first
    const matchData = await riotAPI.getRecentMatches(gameName, tagLine, 20);
    
    if (matchData.length === 0) {
      return NextResponse.json({ 
        error: 'No recent matches found for this summoner' 
      }, { status: 404 });
    }

    const playerInsights = MatchAnalyzer.analyzeMatches(matchData, playerId);

    // Generate AI-powered year-end summary
    let summary = '';
    try {
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        summary = await generateYearEndSummary(playerInsights);
      } else {
        summary = 'AI-powered year-end summary requires AWS credentials. Add them to your .env.local file to enable this feature.';
      }
    } catch (error) {
      console.error('Error generating AI summary:', error);
      summary = 'AI summary temporarily unavailable. Please try again later.';
    }
    
    return NextResponse.json({
      playerId,
      summary,
      data: playerInsights.yearEndSummary
    });
  } catch (error: any) {
    console.error('Error generating year-end summary:', error);
    
    // Handle specific API errors
    if (error.response?.status === 404) {
      return NextResponse.json({ 
        error: 'Account not found. Please check the game name and tag line and try again.' 
      }, { status: 404 });
    }
    
    if (error.response?.status === 429) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please wait a moment and try again.' 
      }, { status: 429 });
    }
    
    if (error.response?.status === 403) {
      return NextResponse.json({ 
        error: 'Invalid or expired API key. Please check your Riot API key.' 
      }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    );
  }
}