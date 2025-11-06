import { RiotAccount, MatchData, PlayerAggregates } from './types';
import * as cache from './cache';

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const RIOT_REGION = process.env.RIOT_REGION || 'americas';

async function riotRequest(path: string, region: string = RIOT_REGION): Promise<unknown> {
  if (!RIOT_API_KEY) {
    throw new Error('RIOT_API_KEY is required but not provided');
  }

  const url = `https://${region}.api.riotgames.com${path}`;
  
  try {
    console.log(`[riotRequest] Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        'X-Riot-Token': RIOT_API_KEY
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[riotRequest] API error:`, {
        url,
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      throw new Error(`Riot API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }
    
    const data = await response.json();
    console.log(`[riotRequest] Success: ${url}`);
    return data;
  } catch (error) {
    console.error(`[riotRequest] Request failed:`, {
      url,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// Map routing regions to platform regions
function getPlatformRegion(routingRegion: string): string {
  const mapping: Record<string, string> = {
    'americas': 'na1',
    'europe': 'euw1',
    'asia': 'kr',
    'sea': 'sg2'
  };
  return mapping[routingRegion.toLowerCase()] || 'na1';
}

export async function getAccountByPuuid(puuid: string): Promise<RiotAccount | null> {
  const cacheKey = cache.cacheKeys.summonerByPuuid(puuid);
  console.log(`[getAccountByPuuid] Looking for cache key: ${cacheKey}`);
  const cached = await cache.get<RiotAccount>(cacheKey);
  if (cached) {
    console.log(`[getAccountByPuuid] Cache hit for ${puuid}:`, cached);
    return cached;
  }
  console.log(`[getAccountByPuuid] Cache miss for ${puuid} - no data found`);
  return null;
}

export async function resolveSummoner(gameName: string, tagLine: string): Promise<RiotAccount> {
  const cacheKey = cache.cacheKeys.summoner(gameName, tagLine);
  const cached = await cache.get<RiotAccount>(cacheKey);
  if (cached) {
    console.log(`[resolveSummoner] Cache hit for ${gameName}#${tagLine}`);
    return cached;
  }

  console.log(`[resolveSummoner] Fetching account for ${gameName}#${tagLine}`);
  
  // Step 1: Get account info (PUUID, gameName, tagLine)
  const accountData = await riotRequest(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`) as {
    puuid: string;
    gameName: string;
    tagLine: string;
  };

  const platform = getPlatformRegion(RIOT_REGION);

  // Step 2: Get summoner info (summonerId, profileIconId, summonerLevel)
  console.log(`[resolveSummoner] Fetching summoner info from ${platform} for ${accountData.puuid}`);
  const summonerData = await riotRequest(`/lol/summoner/v4/summoners/by-puuid/${accountData.puuid}`, platform) as {
    id: string;
    profileIconId: number;
    summonerLevel: number;
  };

  const account: RiotAccount = {
    puuid: accountData.puuid,
    gameName: accountData.gameName,
    tagLine: accountData.tagLine,
    region: RIOT_REGION,
    platform: platform,
    summonerId: summonerData.id,
    profileIconId: summonerData.profileIconId,
    summonerLevel: summonerData.summonerLevel
  };

  console.log(`[resolveSummoner] Caching account for ${gameName}#${tagLine}:`, account);
  
  // Cache by gameName#tagLine
  console.log(`[resolveSummoner] Cache key 1: ${cacheKey}`);
  await cache.setLong(cacheKey, account);
  
  // Also cache by PUUID for quick lookups
  const puuidCacheKey = cache.cacheKeys.summonerByPuuid(account.puuid);
  console.log(`[resolveSummoner] Cache key 2: ${puuidCacheKey}`);
  await cache.setLong(puuidCacheKey, account);
  
  console.log(`[resolveSummoner] Successfully cached account in both keys`);
  
  return account;
}

export async function fetchMatchIds(
  puuid: string, 
  queueIds?: number[], 
  start?: number, 
  startTime: number=1735689600, // January 1st, 2025 00:00:00 UTC in seconds
  endTime: number=Math.floor(Date.now() / 1000), // Current time in seconds
  count: number = 100
): Promise<{ ids: string[]; nextStart: number }> {

  let path = `/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}&startTime=${startTime}&endTime=${endTime}`;
  if (start) path += `&start=${start}`;
  if (queueIds) path += `&queue=${queueIds.join(',')}`;

  const data = await riotRequest(path) as string[];
  
  return { ids: data, nextStart: (start || 0) + data.length };
}

export async function fetchMatchDetail(matchId: string, targetPuuid?: string): Promise<MatchData | null> {
  try {
    // Check cache first
    const cacheKey = `match-detail-${matchId}`;
    const cached = await cache.get<MatchData>(cacheKey);
    if (cached) {
      console.log(`[fetchMatchDetail] Cache hit for ${matchId}`);
      return cached;
    }

    console.log(`[fetchMatchDetail] Fetching ${matchId} from Riot API`);
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
          riotIdGameName: string;
          riotIdTagline?: string;
          individualPosition?: string;
          championId?: number;
          championName?: string;
          kills?: number;
          deaths?: number;
          assists?: number;
          totalDamageDealt?: number;
          totalDamageDealtToChampions?: number;
          totalDamageTaken?: number;
          totalHeal?: number;
          totalHealsOnTeammates?: number;
          goldEarned?: number;
          goldSpent?: number;
          win?: boolean;
          teamPosition?: string;
          role?: string;
          lane?: string;
          item0?: number;
          item1?: number;
          item2?: number;
          item3?: number;
          item4?: number;
          item5?: number;
          item6?: number;
          champLevel?: number;
          summoner1Id?: number;
          summoner2Id?: number;
          visionScore?: number;
          wardsPlaced?: number;
          wardsKilled?: number;
          visionWardsBoughtInGame?: number;
        }>;
      };
    };

    if (!data || !data.metadata || !data.info) {
      console.error(`[fetchMatchDetail] Invalid response for ${matchId}:`, data);
      return null;
    }

    console.log(`[fetchMatchDetail] Successfully fetched ${matchId}`);
    
    // Transform Riot API response to our MatchData format
  // If targetPuuid is provided, only include full data for that player
  const matchData: MatchData = {
    gameId: data.metadata.matchId,
    gameCreation: data.info.gameCreation,
    gameDuration: data.info.gameDuration,
    gameMode: data.info.gameMode,
    gameType: data.info.gameType,
    participants: data.info.participants.map((p) => {
      // Check if this is full participant data (has all the game stats)
      const hasFullData = p.puuid && p.championId !== undefined && p.kills !== undefined;
      
      // If this is the target player OR no target specified, and has full data
      const isTargetPlayer = !targetPuuid || p.puuid === targetPuuid;
      
      if (hasFullData && isTargetPlayer) {
        return {
          puuid: p.puuid!,
          riotIdGameName: p.riotIdGameName,
          championId: p.championId!,
          championName: p.championName!,
          kills: p.kills!,
          deaths: p.deaths!,
          assists: p.assists!,
          totalDamageDealt: p.totalDamageDealtToChampions!,
          totalDamageDealtToChampions: p.totalDamageDealtToChampions,
          totalDamageTaken: p.totalDamageTaken,
          totalHeal: p.totalHeal,
          totalHealsOnTeammates: p.totalHealsOnTeammates,
          goldEarned: p.goldEarned!,
          goldSpent: p.goldSpent,
          win: p.win!,
          role: p.individualPosition || p.role || '',
          lane: p.lane || 'NONE',
          items: [p.item0 || 0, p.item1 || 0, p.item2 || 0, p.item3 || 0, p.item4 || 0, p.item5 || 0, p.item6 || 0],
          champLevel: p.champLevel!,
          summoner1Id: p.summoner1Id!,
          summoner2Id: p.summoner2Id!,
          visionScore: p.visionScore,
          wardsPlaced: p.wardsPlaced,
          wardsKilled: p.wardsKilled,
          visionWardsBoughtInGame: p.visionWardsBoughtInGame
        };
      } else {
        // For other players, only include puuid and riotIdGameName
        // Use the puuid from metadata.participants if not available
        const participantIndex = data.info.participants.indexOf(p);
        return {
          puuid: p.puuid || data.metadata.participants[participantIndex] || '',
          riotIdGameName: p.riotIdGameName
        };
      }
    })
  };

  // Cache the match data for 1 hour (matches don't change)
  await cache.set(cacheKey, matchData, 3600);
  console.log(`[fetchMatchDetail] Cached match ${matchId}`);
  
  return matchData;
  } catch (error) {
    console.error(`[fetchMatchDetail] Error fetching match ${matchId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}

// Alias for backward compatibility with compute functions
export const fetchMatchDetailFromCache = fetchMatchDetail;

// Stub function for computeAggregates - to be implemented
export async function computeAggregates(puuid: string): Promise<any> {
  console.warn('[computeAggregates] This function needs to be implemented');
  // Return dummy data for now to prevent errors
  return {
    peak: {
      kills: 0,
      deaths: 0,
      assists: 0,
      gpm: 0,
      championName: 'Unknown'
    },
    totals: {
      games: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0
    }
  };
}