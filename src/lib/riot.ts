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
  const data = await riotRequest(`/lol/match/v5/matches/${matchId}`) as {
    metadata: { matchId: string };
    info: {
      gameCreation: number;
      gameDuration: number;
      gameMode: string;
      gameType: string;
      participants: Array<{
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
      }>;
    };
  };

  // Transform Riot API response to our MatchData format
  return {
    gameId: data.metadata.matchId,
    gameCreation: data.info.gameCreation,
    gameDuration: data.info.gameDuration,
    gameMode: data.info.gameMode,
    gameType: data.info.gameType,
    participants: data.info.participants.map((p) => ({
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
      lane: p.lane
    }))
  };
}

export async function computeAggregates(puuid: string, season: string): Promise<PlayerAggregates> {
  const cacheKey = cache.cacheKeys.aggregates(puuid, season);
  const cached = await cache.get<PlayerAggregates>(cacheKey);
  if (cached) return cached;

  // TODO: Implement real aggregation by fetching all matches for the season
  // For now, return N/A structure since we don't have real data
  throw new Error('No match data available - aggregation requires real Riot API data');
}