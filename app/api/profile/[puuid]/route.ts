import { NextRequest, NextResponse } from 'next/server';
import { getAccountByPuuid } from '@/src/lib/riot';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ puuid: string }> }
) {
  try {
    const { puuid } = await params;

    console.log(`[Profile API] Looking up cached account for ${puuid}`);
    
    // Try to get from cache first
    const cachedAccount = await getAccountByPuuid(puuid);
    
    if (cachedAccount) {
      console.log(`[Profile API] Found cached account:`, {
        name: cachedAccount.gameName,
        tagLine: cachedAccount.tagLine,
        level: cachedAccount.summonerLevel,
        iconId: cachedAccount.profileIconId
      });
      
      return NextResponse.json({
        id: cachedAccount.summonerId || '',
        accountId: cachedAccount.puuid,
        puuid: cachedAccount.puuid,
        name: cachedAccount.gameName,
        tagLine: cachedAccount.tagLine,
        profileIconId: cachedAccount.profileIconId || 0,
        revisionDate: Date.now(),
        summonerLevel: cachedAccount.summonerLevel || 0
      });
    }

    // If not cached, return error - user should search first
    console.log(`[Profile API] No cached account found for ${puuid}`);
    return NextResponse.json(
      { error: 'Account not found. Please search for the summoner first.' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch summoner profile' },
      { status: 500 }
    );
  }
}
