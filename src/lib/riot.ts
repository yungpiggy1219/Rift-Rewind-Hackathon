import { RiotAccount, MatchData, PlayerAggregates } from './types';
import * as cache from './cache';

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const RIOT_REGION = process.env.RIOT_REGION || 'americas';

// Mock data for when no API key is provided
const MOCK_ACCOUNT: RiotAccount = {
  puuid: 'mock-puuid-12345',
  gameName: 'MockSummoner',
  tagLine: 'NA1',
  region: 'americas'
};

const MOCK_MATCHES: MatchData[] = Array.from({ length: 50 }, (_, i) => ({
  gameId: `mock-match-${i}`,
  gameCreation: Date.now() - (i * 24 * 60 * 60 * 1000), // Spread over 50 days
  gameDuration: 1800 + Math.random() * 1200, // 30-50 minutes
  gameMode: 'CLASSIC',
  gameType: 'MATCHED_GAME',
  participants: Array.from({ length: 10 }, (_, j) => ({
    summonerName: j === 0 ? 'MockSummoner' : `Player${j}`,
    championId: Math.floor(Math.random() * 160) + 1,
    championName: ['Jinx', 'Yasuo', 'Thresh', 'Lee Sin', 'Ahri'][Math.floor(Math.random() * 5)],
    kills: Math.floor(Math.random() * 15),
    deaths: Math.floor(Math.random() * 10),
    assists: Math.floor(Math.random() * 20),
    totalDamageDealt: 15000 + Math.random() * 25000,
    goldEarned: 10000 + Math.random() * 8000,
    win: Math.random() > 0.5,
    role: ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'][j % 5],
    lane: ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'BOTTOM'][j % 5]
  }))
}));

async function riotRequest(path: string, region: string = RIOT_REGION): Promise<any> {
  if (!RIOT_API_KEY) {
    console.warn('No RIOT_API_KEY provided, using mock data');
    return null; // Will trigger mock responses
  }

  const url = `https://${region}.api.riotgames.com${path}`;
  const response = await fetch(url, {
    headers: {
      'X-Riot-Token': RIOT_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Riot API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function resolveSummoner(gameName: string, tagLine: string): Promise<RiotAccount> {
  const cacheKey = cache.cacheKeys.summoner(gameName, tagLine);
  const cached = await cache.get<RiotAccount>(cacheKey);
  if (cached) return cached;

  try {
    const data = await riotRequest(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
    
    if (!data) {
      // Return mock data if no API key
      const mockAccount = { ...MOCK_ACCOUNT, gameName, tagLine };
      await cache.set(cacheKey, mockAccount);
      return mockAccount;
    }

    const account: RiotAccount = {
      puuid: data.puuid,
      gameName: data.gameName,
      tagLine: data.tagLine,
      region: RIOT_REGION
    };

    await cache.setLong(cacheKey, account);
    return account;
  } catch (error) {
    console.error('Error resolving summoner:', error);
    // Fallback to mock data
    const mockAccount = { ...MOCK_ACCOUNT, gameName, tagLine };
    await cache.set(cacheKey, mockAccount);
    return mockAccount;
  }
}

export async function fetchMatchIds(
  puuid: string, 
  queueIds?: number[], 
  start?: number, 
  count: number = 20
): Promise<{ ids: string[]; nextStart: number }> {
  try {
    let path = `/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`;
    if (start) path += `&start=${start}`;
    if (queueIds) path += `&queue=${queueIds.join(',')}`;

    const data = await riotRequest(path);
    
    if (!data) {
      // Return mock match IDs
      const mockIds = MOCK_MATCHES.slice(start || 0, (start || 0) + count).map(m => m.gameId);
      return { ids: mockIds, nextStart: (start || 0) + mockIds.length };
    }

    return { ids: data, nextStart: (start || 0) + data.length };
  } catch (error) {
    console.error('Error fetching match IDs:', error);
    // Fallback to mock data
    const mockIds = MOCK_MATCHES.slice(start || 0, (start || 0) + count).map(m => m.gameId);
    return { ids: mockIds, nextStart: (start || 0) + mockIds.length };
  }
}

export async function fetchMatchDetail(matchId: string): Promise<MatchData | null> {
  try {
    const data = await riotRequest(`/lol/match/v5/matches/${matchId}`);
    
    if (!data) {
      // Return mock match data
      const mockMatch = MOCK_MATCHES.find(m => m.gameId === matchId);
      return mockMatch || null;
    }

    // Transform Riot API response to our MatchData format
    return {
      gameId: data.metadata.matchId,
      gameCreation: data.info.gameCreation,
      gameDuration: data.info.gameDuration,
      gameMode: data.info.gameMode,
      gameType: data.info.gameType,
      participants: data.info.participants.map((p: any) => ({
        summonerName: p.summonerName || p.riotIdGameName || 'Unknown',
        championId: p.championId,
        championName: p.championName,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        totalDamageDealt: p.totalDamageDealtToChampions,
        goldEarned: p.goldEarned,
        win: p.win,
        role: p.teamPosition || p.role,
        lane: p.lane
      }))
    };
  } catch (error) {
    console.error('Error fetching match detail:', error);
    return null;
  }
}

export async function computeAggregates(puuid: string, season: string): Promise<PlayerAggregates> {
  const cacheKey = cache.cacheKeys.aggregates(puuid, season);
  const cached = await cache.get<PlayerAggregates>(cacheKey);
  if (cached) return cached;

  try {
    // For now, use mock data or simplified aggregation
    // In a real implementation, you'd fetch all matches and compute these stats
    const matches = MOCK_MATCHES;
    
    const totalMatches = matches.length;
    const totalHours = matches.reduce((sum, match) => sum + (match.gameDuration / 3600), 0);
    
    // Generate monthly breakdown
    const months: { [key: string]: { matches: number; hours: number } } = {};
    matches.forEach(match => {
      const date = new Date(match.gameCreation);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months[monthKey]) {
        months[monthKey] = { matches: 0, hours: 0 };
      }
      months[monthKey].matches++;
      months[monthKey].hours += match.gameDuration / 3600;
    });

    // Mock performance trends
    const gpmSeries = Array.from({ length: 12 }, () => 300 + Math.random() * 200);
    const kdaSeries = Array.from({ length: 12 }, () => 1.5 + Math.random() * 1.5);
    const winRateSeries = Array.from({ length: 12 }, () => 0.4 + Math.random() * 0.4);

    const aggregates: PlayerAggregates = {
      timeframe: {
        start: '2025-01-01',
        end: '2025-12-31'
      },
      totals: {
        matches: totalMatches,
        hours: Math.round(totalHours * 10) / 10
      },
      months,
      gpm: {
        start: gpmSeries[0],
        end: gpmSeries[gpmSeries.length - 1],
        deltaPct: ((gpmSeries[gpmSeries.length - 1] - gpmSeries[0]) / gpmSeries[0]) * 100,
        series: gpmSeries
      },
      kda: {
        start: kdaSeries[0],
        end: kdaSeries[kdaSeries.length - 1],
        trendSlope: (kdaSeries[kdaSeries.length - 1] - kdaSeries[0]) / kdaSeries.length,
        series: kdaSeries
      },
      winRate: {
        start: winRateSeries[0],
        end: winRateSeries[winRateSeries.length - 1],
        deltaPct: ((winRateSeries[winRateSeries.length - 1] - winRateSeries[0]) / winRateSeries[0]) * 100,
        series: winRateSeries
      },
      peak: {
        date: '2025-06-15',
        kills: 18,
        deaths: 2,
        assists: 12,
        gpm: 485,
        matchId: 'mock-peak-match'
      }
    };

    await cache.setLong(cacheKey, aggregates);
    return aggregates;
  } catch (error) {
    console.error('Error computing aggregates:', error);
    throw error;
  }
}