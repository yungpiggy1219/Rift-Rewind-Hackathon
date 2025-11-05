export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameName = searchParams.get('gameName');
    const tagLine = searchParams.get('tagLine');
    
    if (!gameName || !tagLine) {
      return NextResponse.json({ error: 'Game name and tag line are required' }, { status: 400 });
    }

    // Check if Riot API key is configured
    if (!process.env.RIOT_API_KEY) {
      return NextResponse.json({ 
        error: 'Riot API key is not configured. Please add RIOT_API_KEY to your .env.local file.' 
      }, { status: 500 });
    }

    // Fetch real data from Riot API - get ALL 2025 matches for year-end review
    console.log(`🔍 Fetching 2025 year-end data for ${gameName}#${tagLine}...`);
    const matchData = await riotAPI.get2025Matches(gameName, tagLine);
    
    if (matchData.length === 0) {
      return NextResponse.json({ 
        error: 'No recent matches found for this summoner' 
      }, { status: 404 });
    }

    console.log(`📊 Analyzing ${matchData.length} matches...`);

    // Get account info to include PUUID in response
    const account = await riotAPI.getAccountByRiotId(gameName, tagLine);
    
    // Analyze matches using MatchAnalyzer (static methods)
    const playerName = `${gameName}#${tagLine}`;
    const insights = MatchAnalyzer.analyzeMatches(matchData, playerName);
    
    // Add additional metadata including PUUID
    insights.dataSource = 'riot-api';
    insights.matchCount = matchData.length;
    insights.puuid = account.puuid;
    insights.region = account.regionDisplay;

    // Try to generate AI insights if AWS is configured
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        const aiInsights = await generateInsights(matchData);
        insights.aiGeneratedInsights = aiInsights;
      } catch (aiError) {
        console.warn('AI insights generation failed:', aiError);
        // Continue without AI insights
      }
    }

    return NextResponse.json(insights);
  } catch (error: any) {
    console.error('Error fetching insights:', error);
    
    // Handle specific error messages from our improved API
    if (error.message?.includes('API key invalid or expired')) {
      return NextResponse.json({ 
        error: 'Invalid or expired API key. Please regenerate your Riot API key at developer.riotgames.com (dev keys expire after 24 hours).' 
      }, { status: 403 });
    }
    
    if (error.message?.includes('Player not found')) {
      return NextResponse.json({ 
        error: 'Player not found in any region. Please check the game name and tag line and try again.' 
      }, { status: 404 });
    }
    
    if (error.message?.includes('No matches found')) {
      return NextResponse.json({ 
        error: 'No recent ranked/normal matches found for this player. This could be because: 1) The account has no recent matches, 2) Match history is private, or 3) Only ARAM/custom games were played recently.' 
      }, { status: 404 });
    }
    
    // Handle axios errors
    if (error.response?.status === 429) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please wait a moment and try again.' 
      }, { status: 429 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch insights from Riot API' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { generateInsights } from '@/lib/aws-bedrock';
import { riotAPI } from '@/lib/riot-api';
import { MatchAnalyzer } from '@/lib/match-analyzer';

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