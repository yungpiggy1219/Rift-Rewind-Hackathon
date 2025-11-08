import { RiotAccount, MatchData, PlayerAggregates } from './types';
import * as cache from './cache';

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const RIOT_REGION = process.env.RIOT_REGION || 'americas';

// Rate limiting: 20 requests per second, 100 requests per 2 minutes
const RATE_LIMIT_PER_SECOND = 20;
const RATE_LIMIT_PER_2_MINUTES = 100;
const REQUEST_INTERVAL_MS = 1000 / RATE_LIMIT_PER_SECOND; // ~50ms between requests

// Track request timestamps for rate limiting
let requestTimestamps: number[] = [];

// Helper function to enforce rate limiting
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();

  // Remove timestamps older than 2 minutes
  requestTimestamps = requestTimestamps.filter(ts => now - ts < 120000);

  // Check 2-minute limit
  if (requestTimestamps.length >= RATE_LIMIT_PER_2_MINUTES) {
    const oldestRequest = Math.min(...requestTimestamps);
    const waitTime = 120000 - (now - oldestRequest);
    if (waitTime > 0) {
      console.log(`[riotRequest] Rate limit: waiting ${waitTime}ms for 2-minute window`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return enforceRateLimit(); // Recheck after waiting
    }
  }

  // Check per-second limit
  const recentRequests = requestTimestamps.filter(ts => now - ts < 1000);
  if (recentRequests.length >= RATE_LIMIT_PER_SECOND) {
    const waitTime = REQUEST_INTERVAL_MS;
    console.log(`[riotRequest] Rate limit: waiting ${waitTime}ms for per-second limit`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  requestTimestamps.push(now);
}

async function riotRequest(path: string, region: string = RIOT_REGION, retryCount: number = 0): Promise<unknown> {
  if (!RIOT_API_KEY) {
    throw new Error('RIOT_API_KEY is required but not provided');
  }

  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  try {
    await enforceRateLimit();

    const url = `https://${region}.api.riotgames.com${path}`;

    try {
      console.log(`[riotRequest] Fetching: ${url} (attempt ${retryCount + 1})`);
      const response = await fetch(url, {
        headers: {
          'X-Riot-Token': RIOT_API_KEY
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (response.status === 429) {
        // Rate limit exceeded
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * baseDelay;

        if (retryCount < maxRetries) {
          console.log(`[riotRequest] Rate limited, retrying in ${waitTime}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return riotRequest(path, region, retryCount + 1);
        } else {
          throw new Error(`Rate limit exceeded after ${maxRetries} retries`);
        }
      }

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
      if (error instanceof Error && error.name === 'TimeoutError') {
        if (retryCount < maxRetries) {
          const waitTime = Math.pow(2, retryCount) * baseDelay;
          console.log(`[riotRequest] Request timeout, retrying in ${waitTime}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return riotRequest(path, region, retryCount + 1);
        }
      }

      console.error(`[riotRequest] Request failed after ${retryCount + 1} attempts:`, {
        url,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  } catch (error) {
    console.error(`[riotRequest] Request failed:`, {
      url: `https://${region}.api.riotgames.com${path}`,
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
  const cached = await cache.get(cacheKey);
  if (cached) {
    console.log(`[getAccountByPuuid] Cache hit for ${puuid}:`, cached);
    return cached;
  }
  console.log(`[getAccountByPuuid] Cache miss for ${puuid} - no data found`);
  return null;
}

export async function resolveSummoner(gameName: string, tagLine: string): Promise<RiotAccount> {
  const cacheKey = cache.cacheKeys.summoner(gameName, tagLine);
  const cached = await cache.get(cacheKey);
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

// Fetch ranked stats for a summoner
export async function fetchRankedStats(puuid: string, platform?: string): Promise<{
  soloQueue: {
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    queueType: string;
  } | null;
  flexQueue: {
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    queueType: string;
  } | null;
} | null> {
  try {
    // Get the account to determine the correct platform
    const account = await getAccountByPuuid(puuid);
    const targetPlatform = platform || account?.platform || getPlatformRegion(RIOT_REGION);
    
    console.log(`[fetchRankedStats] Fetching ranked stats for PUUID ${puuid} on ${targetPlatform}`);
    
    const cacheKey = `ranked-stats:${puuid}:2025`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      console.log(`[fetchRankedStats] Cache hit for ${puuid}`);
      return cached as {
        soloQueue: {
          tier: string;
          rank: string;
          leaguePoints: number;
          wins: number;
          losses: number;
          queueType: string;
        } | null;
        flexQueue: {
          tier: string;
          rank: string;
          leaguePoints: number;
          wins: number;
          losses: number;
          queueType: string;
        } | null;
      };
    }
    
    // Fetch league entries directly by PUUID
    const leagueData = await riotRequest(
      `/lol/league/v4/entries/by-puuid/${puuid}`,
      targetPlatform
    ) as Array<{
      queueType: string;
      tier: string;
      rank: string;
      leaguePoints: number;
      wins: number;
      losses: number;
    }>;
    
    if (!leagueData || leagueData.length === 0) {
      console.log(`[fetchRankedStats] No ranked data found for ${puuid}`);
      return null;
    }
    
    // Get both Solo/Duo and Flex queue data
    const soloQueue = leagueData.find(entry => entry.queueType === 'RANKED_SOLO_5x5') || null;
    const flexQueue = leagueData.find(entry => entry.queueType === 'RANKED_FLEX_SR') || null;
    
    const rankedData = {
      soloQueue,
      flexQueue
    };
    
    // Cache for 1 hour (ranked stats change frequently)
    await cache.set(cacheKey, rankedData, 3600);
    
    console.log(`[fetchRankedStats] Successfully fetched ranked stats:`, rankedData);
    return rankedData;
    
  } catch (error) {
    console.error(`[fetchRankedStats] Error fetching ranked stats:`, error);
    return null;
  }
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
    const cached = await cache.get(cacheKey);
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
          timeSpentDead?: number;
          longestTimeSpentLiving?: number;
          timePlayed?: number;
          teamId?: number;
          pentaKills?: number;
          quadraKills?: number;
          tripleKills?: number;
          doubleKills?: number;
          largestKillingSpree?: number;
          largestMultiKill?: number;
          baronKills?: number;
          dragonKills?: number;
          elderDragonKills?: number;
          elderDragonMultikills?: number;
          objectivesStolen?: number;
          objectivesStolenAssists?: number;
          skillshotsHit?: number;
          skillshotsDodged?: number;
          soloKills?: number;
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
          visionWardsBoughtInGame: p.visionWardsBoughtInGame,
          timeSpentDead: p.timeSpentDead,
          longestTimeSpentLiving: p.longestTimeSpentLiving,
          timePlayed: p.timePlayed,
          teamId: p.teamId,
          pentaKills: p.pentaKills,
          quadraKills: p.quadraKills,
          tripleKills: p.tripleKills,
          doubleKills: p.doubleKills,
          largestKillingSpree: p.largestKillingSpree,
          largestMultiKill: p.largestMultiKill,
          baronKills: p.baronKills,
          dragonKills: p.dragonKills,
          elderDragonKills: p.elderDragonKills,
          elderDragonMultikills: p.elderDragonMultikills,
          objectivesStolen: p.objectivesStolen,
          objectivesStolenAssists: p.objectivesStolenAssists,
          skillshotsHit: p.skillshotsHit,
          skillshotsDodged: p.skillshotsDodged,
          soloKills: p.soloKills
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function computeAggregates(_puuid: string): Promise<{
  peak: {
    kills: number;
    deaths: number;
    assists: number;
    gpm: number;
    championName: string;
    date: string;
    matchId: string;
  };
  totals: {
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
  };
  kda: {
    series: number[];
  };
  gpm: {
    series: number[];
  };
}> {
  console.warn('[computeAggregates] This function needs to be implemented');
  // Return dummy data for now to prevent errors
  return {
    peak: {
      kills: 10,
      deaths: 2,
      assists: 15,
      gpm: 450,
      championName: 'Unknown',
      date: new Date().toISOString(),
      matchId: 'dummy'
    },
    totals: {
      games: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0
    },
    kda: {
      series: [2.5, 3.1, 1.8, 4.2, 2.9] // Dummy KDA series
    },
    gpm: {
      series: [380, 420, 350, 480, 410] // Dummy GPM series
    }
  };
}