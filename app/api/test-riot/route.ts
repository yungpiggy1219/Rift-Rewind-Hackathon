import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testSummoner = searchParams.get('summoner') || 'Faker';
    
    if (!process.env.RIOT_API_KEY) {
      return NextResponse.json({ 
        error: 'RIOT_API_KEY not found in environment variables',
        hasKey: false
      }, { status: 500 });
    }

    console.log('Testing API key:', process.env.RIOT_API_KEY.substring(0, 10) + '...');
    
    // Test different regions
    const regions = ['na1', 'euw1', 'kr'];
    const results = [];
    
    for (const region of regions) {
      try {
        const url = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${testSummoner}`;
        console.log(`Testing ${region}:`, url);
        
        const response = await axios.get(url, {
          headers: {
            'X-Riot-Token': process.env.RIOT_API_KEY,
          },
          timeout: 5000
        });
        
        results.push({
          region,
          status: 'success',
          data: {
            name: response.data.name,
            level: response.data.summonerLevel,
            id: response.data.id
          }
        });
        
        // If we found the summoner, break
        break;
      } catch (error: any) {
        results.push({
          region,
          status: 'error',
          error: error.response?.status || 'network_error',
          message: error.response?.data?.status?.message || error.message
        });
      }
    }
    
    return NextResponse.json({
      apiKey: process.env.RIOT_API_KEY.substring(0, 15) + '...',
      testSummoner,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}