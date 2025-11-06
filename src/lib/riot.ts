import { RiotAccount, MatchData, PlayerAggregates } from './types';
import * as cache from './cache';

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const RIOT_REGION = process.env.RIOT_REGION || 'americas';

async function riotRequest(path: string, region: string = RIOT_REGION): Promise<unknown> {
  if (!RIOT_API_KEY) {
    throw new Error('RIOT_API_KEY is required but not provided');
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

  const data = await riotRequest(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`) as {
    puuid: string;
    gameName: string;
    tagLine: string;
  };

  const account: RiotAccount = {
    puuid: data.puuid,
    gameName: data.gameName,
    tagLine: data.tagLine,
    region: RIOT_REGION
  };

  await cache.setLong(cacheKey, account);
  return account;
}

export async function fetchMatchIds(
  puuid: string, 
  queueIds?: number[], 
  start?: number, 
  count: number = 20
): Promise<{ ids: string[]; nextStart: number }> {
  let path = `/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`;
  if (start) path += `&start=${start}`;
  if (queueIds) path += `&queue=${queueIds.join(',')}`;

  const data = await riotRequest(path) as string[];
  
  return { ids: data, nextStart: (start || 0) + data.length };
}

export async function fetchMatchDetail(matchId: string): Promise<MatchData | null> {
  // Check cache first
  const cacheKey = `match-detail-${matchId}`;
  const cached = await cache.get<MatchData>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await riotRequest(`/lol/match/v5/matches/${matchId}`) as {
    metadata: { 
      matchId: string;
      participants: string[]; // Array of PUUIDs
    };
    info: {
      gameCreation: number;
      gameDuration: number;
      gameMode: string;
      gameType: string;
      participants: Array<{
        puuid: string;
        summonerName?: string;
        riotIdGameName?: string;
        championId: number;
        championName: string;
        kills: number;
        deaths: number;
        assists: number;
        totalDamageDealtToChampions: number;
        goldEarned: number;
        win: boolean;
        teamPosition?: string;
        role?: string;
        lane: string;
        item0: number;
        item1: number;
        item2: number;
        item3: number;
        item4: number;
        item5: number;
        item6: number;
        champLevel: number;
        summoner1Id: number;
        summoner2Id: number;
      }>;
    };
  };

  // Transform Riot API response to our MatchData format
  const matchData: MatchData = {
    gameId: data.metadata.matchId,
    gameCreation: data.info.gameCreation,
    gameDuration: data.info.gameDuration,
    gameMode: data.info.gameMode,
    gameType: data.info.gameType,
    participants: data.info.participants.map((p) => ({
      puuid: p.puuid,
      summonerName: p.summonerName || p.riotIdGameName || 'Unknown',
      championId: p.championId,
      championName: p.championName,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      totalDamageDealt: p.totalDamageDealtToChampions,
      goldEarned: p.goldEarned,
      win: p.win,
      role: p.teamPosition || p.role || 'Unknown',
      lane: p.lane,
      items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6],
      champLevel: p.champLevel,
      summoner1Id: p.summoner1Id,
      summoner2Id: p.summoner2Id
    }))
  };

  // Cache the match data for 1 hour (matches don't change)
  await cache.set(cacheKey, matchData, 3600);
  
  return matchData;
}

export async function computeAggregates(puuid: string): Promise<PlayerAggregates> {
  const cacheKey = cache.cacheKeys.aggregates(puuid);
  const cached = await cache.get<PlayerAggregates>(cacheKey);
  if (cached) return cached;

  // Determine season year range (Jan 1 2025 to Nov 5 2025)
    const startTimestamp = 1735689600; // January 1st, 2025 00:00:00 UTC in seconds
    const endTimestamp = 1762387199; // November 5th, 2025 23:59:59 UTC in seconds

  console.log('[computeAggregates] Fetching match IDs for 2025');
  
  // Step 1: Fetch all match IDs using dedicated endpoint (which caches them)
  let allMatchIds: string[] = [];
  let start = 0;
  const batchSize = 100;
  let batchCount = 0;
  
  // Fetch all match IDs until we get less than a full batch
  while (true) {
    batchCount++;
    console.log(`[computeAggregates] Fetching batch ${batchCount} at start=${start}`);
    
    const { ids, nextStart } = await fetchMatchIds(puuid, undefined, start, batchSize);
    
    // No more matches available
    if (ids.length === 0) {
      console.log(`[computeAggregates] No more matches found, stopping`);
      break;
    }
    
    console.log(`[computeAggregates] Got ${ids.length} match IDs in batch ${batchCount + 1}`);
    
    allMatchIds.push(...ids);
    
    if (ids.length < batchSize) {
      console.log(`[computeAggregates] Got fewer than ${batchSize} matches, reached end of history`);
      break;
    }
    
    start = nextStart;
  }
  
  // Remove duplicates
  allMatchIds = [...new Set(allMatchIds)];
  
  console.log(`[computeAggregates] Total unique match IDs collected: ${allMatchIds.length}`);

  // Step 2: Initialize aggregates structure
  const months: Record<string, { matches: number; hours: number }> = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  let totalMatches = 0;
  let totalHours = 0;
  const kdaSeries: number[] = [];
  const gpmSeries: number[] = [];
  const winRateSeries: number[] = [];
  let peakKills = 0;
  let peakDeaths = 0;
  let peakAssists = 0;
  let peakGpm = 0;
  let peakDate = '';
  let peakMatchId = '';
  
  // Step 3: Fetch match details and filter by season timestamp
  console.log('[computeAggregates] Processing match details for 2025...');
  
  // Rate limiting: Process in batches with delays
  const BATCH_SIZE = 50; // Process 50 matches at a time
  const BATCH_DELAY_MS = 500; // Wait 500ms between batches
  
  for (let i = 0; i < allMatchIds.length; i++) {
    const matchId = allMatchIds[i];
    
    // Add delay every BATCH_SIZE requests to avoid rate limiting
    if (i > 0 && i % BATCH_SIZE === 0) {
      console.log(`[computeAggregates] Processed ${i}/${allMatchIds.length} matches, waiting ${BATCH_DELAY_MS}ms...`);
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
    
    try {
      const match = await fetchMatchDetail(matchId);
      if (!match) {
        console.warn(`[computeAggregates] Failed to fetch match ${matchId}`);
        continue;
      }
      
      // Filter by season timestamp - skip if outside season
      if (match.gameCreation < startTimestamp) {
        console.log(`[computeAggregates] Match ${matchId} is before season start, stopping further processing`);
        // Since matches are ordered newest to oldest, we can stop here
        break;
      }
      
      if (match.gameCreation > endTimestamp) {
        console.log(`[computeAggregates] Match ${matchId} is after season end, skipping`);
        continue;
      }
      
      // Find player in participants by PUUID
      const playerData = match.participants.find(p => p.puuid === puuid);
      
      if (!playerData) {
        console.warn(`Player not found in match ${matchId}`);
        continue;
      }
      
      // Calculate month
      const matchDate = new Date(match.gameCreation);
      const monthKey = `${monthNames[matchDate.getMonth()]}`;
      
      if (!months[monthKey]) {
        months[monthKey] = { matches: 0, hours: 0 };
      }
      
      const hours = match.gameDuration / 3600; // Convert seconds to hours
      months[monthKey].matches += 1;
      months[monthKey].hours += hours;
      
      totalMatches += 1;
      totalHours += hours;
      
      // Calculate KDA
      const kda = playerData.deaths === 0 
        ? (playerData.kills + playerData.assists) 
        : (playerData.kills + playerData.assists) / playerData.deaths;
      kdaSeries.push(kda);
      
      // Calculate GPM
      const gpm = (playerData.goldEarned / match.gameDuration) * 60;
      gpmSeries.push(gpm);
      
      // Track win rate
      winRateSeries.push(playerData.win ? 1 : 0);
      
      // Track peak performance
      if (playerData.kills > peakKills) {
        peakKills = playerData.kills;
        peakDeaths = playerData.deaths;
        peakAssists = playerData.assists;
        peakGpm = gpm;
        peakDate = matchDate.toISOString().split('T')[0];
        peakMatchId = matchId;
      }
    } catch (error) {
      console.error(`Error processing match ${matchId}:`, error);
      continue;
    }
  }

  console.log(`[computeAggregates] Finished processing. Total matches in season: ${totalMatches}, Total hours: ${totalHours.toFixed(1)}`);

  // Calculate averages and trends
  const startKda = kdaSeries.slice(0, 10).reduce((a, b) => a + b, 0) / Math.min(10, kdaSeries.length);
  const endKda = kdaSeries.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, kdaSeries.length);
  const kdaTrendSlope = endKda - startKda;
  
  const startGpm = gpmSeries.slice(0, 10).reduce((a, b) => a + b, 0) / Math.min(10, gpmSeries.length);
  const endGpm = gpmSeries.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, gpmSeries.length);
  const gpmDeltaPct = startGpm > 0 ? ((endGpm - startGpm) / startGpm) * 100 : 0;
  
  const startWinRate = winRateSeries.slice(0, 10).reduce((a, b) => a + b, 0) / Math.min(10, winRateSeries.length);
  const endWinRate = winRateSeries.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, winRateSeries.length);
  const winRateDeltaPct = startWinRate > 0 ? ((endWinRate - startWinRate) / startWinRate) * 100 : 0;

  const aggregates: PlayerAggregates = {
    timeframe: {
      start: '2025-01-01',
      end: '2025-11-05'
    },
    totals: {
      matches: totalMatches,
      hours: Math.round(totalHours * 10) / 10
    },
    months,
    gpm: {
      start: Math.round(startGpm),
      end: Math.round(endGpm),
      deltaPct: Math.round(gpmDeltaPct * 10) / 10,
      series: gpmSeries.map(v => Math.round(v))
    },
    kda: {
      start: Math.round(startKda * 100) / 100,
      end: Math.round(endKda * 100) / 100,
      trendSlope: Math.round(kdaTrendSlope * 100) / 100,
      series: kdaSeries.map(v => Math.round(v * 100) / 100)
    },
    winRate: {
      start: Math.round(startWinRate * 100),
      end: Math.round(endWinRate * 100),
      deltaPct: Math.round(winRateDeltaPct * 10) / 10,
      series: winRateSeries
    },
    peak: {
      date: peakDate,
      kills: peakKills,
      deaths: peakDeaths,
      assists: peakAssists,
      gpm: Math.round(peakGpm),
      matchId: peakMatchId
    }
  };

  await cache.set(cacheKey, aggregates);
  return aggregates;
}