import axios, { AxiosError } from "axios";
import { MatchData } from "./types";

interface RiotErrorResponse {
  status?: {
    message?: string;
  };
}

const RIOT_API_KEY = process.env.RIOT_API_KEY;

// Routing regions - Riot redirects automatically to correct server
const ROUTING_REGIONS = ['americas', 'europe', 'asia', 'sea'];

// Region display names
const REGION_DISPLAY_NAMES: { [key: string]: string } = {
  'americas': 'Americas',
  'europe': 'Europe', 
  'asia': 'Asia',
  'sea': 'Southeast Asia',
};

// Platform to routing region mapping (for future use)
// const PLATFORM_TO_ROUTING: { [key: string]: string } = {
//   // Americas
//   'na1': 'americas',
//   'br1': 'americas',
//   'la1': 'americas',
//   'la2': 'americas',
//   // Europe
//   'euw1': 'europe',
//   'eun1': 'europe',
//   'tr1': 'europe',
//   'ru': 'europe',
//   // Asia
//   'kr': 'asia',
//   'jp1': 'asia',
//   // Southeast Asia
//   'oc1': 'sea',
//   'ph2': 'sea',
//   'sg2': 'sea',
//   'th2': 'sea',
//   'tw2': 'sea',
//   'vn2': 'sea',
// };

// Rate limiting helper
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface RiotSummoner {
  id: string;
  accountId: string;
  puuid: string;
  name: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

export interface RiotMatch {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameId: number;
    gameMode: string;
    gameType: string;
    participants: RiotParticipant[];
  };
}

export interface RiotParticipant {
  puuid: string;
  summonerName: string;
  championId: number;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  goldEarned: number;
  win: boolean;
  teamPosition: string;
  lane: string;
  role: string;
}

class RiotAPI {
  private async makeRequest<T>(url: string, retries = 3): Promise<T> {
    try {
      console.log("Making request to:", url);
      const response = await axios.get<T>(url, {
        headers: {
          "X-Riot-Token": RIOT_API_KEY,
        },
        timeout: 10000, // 10 second timeout
      });
      return response.data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError<RiotErrorResponse>;
      console.error("API request failed:", {
        url,
        status: axiosError.response?.status,
        message:
          axiosError.response?.data?.status?.message || axiosError.message,
        retries,
      });

      if (axiosError.response?.status === 429 && retries > 0) {
        // Rate limited, wait and retry
        const retryAfter = axiosError.response.headers["retry-after"] || 1;
        console.log(`Rate limited, waiting ${retryAfter} seconds...`);
        await delay(retryAfter * 1000);
        return this.makeRequest(url, retries - 1);
      }

      // Add more specific error messages
      if (axiosError.response?.status === 403) {
        throw new Error(
          "API key is invalid or expired. Please regenerate your Riot API key at developer.riotgames.com"
        );
      }

      if (axiosError.response?.status === 404) {
        throw new Error(
          "Account not found. Please check the game name and tag line and try again."
        );
      }

      throw error;
    }
  }

  async getAccountByRiotId(
    gameName: string,
    tagLine: string
  ): Promise<RiotAccount & { region: string; regionDisplay: string }> {
    console.log(`🔍 Searching for player: ${gameName}#${tagLine} across regions...`);
    
    // Try all routing regions (Riot redirects to correct server)
    for (const region of ROUTING_REGIONS) {
      try {
        console.log(`  📡 Checking region: ${region}`);
        
        const url = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
          gameName
        )}/${encodeURIComponent(tagLine)}`;
        
        const response = await axios.get<RiotAccount>(url, {
          headers: {
            'X-Riot-Token': RIOT_API_KEY,
          },
          timeout: 10000,
        });

        if (response.data) {
          console.log(`  ✅ Found in ${REGION_DISPLAY_NAMES[region]}`);
          return {
            ...response.data,
            region,
            regionDisplay: REGION_DISPLAY_NAMES[region],
          };
        }
      } catch (error: unknown) {
        const axiosError = error as AxiosError<RiotErrorResponse>;
        
        // API key error - don't continue
        if (axiosError.response?.status === 403) {
          console.error(`❌ API key invalid or expired`);
          throw new Error('API key invalid or expired. Please regenerate your Riot API key (24h expiration for dev keys)');
        }
        
        // If 404, try next region
        if (axiosError.response?.status === 404) {
          console.log(`  ⚠️  Not found in ${region}`);
          continue;
        }
        
        console.error(`  ❌ Error checking region ${region}:`, axiosError.message);
      }
    }

    throw new Error('Player not found in any region. Please check your Game Name and Tag Line.');
  }

  async getSummonerByPuuid(puuid: string, platform: string = 'na1'): Promise<RiotSummoner> {
    const url = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    return this.makeRequest<RiotSummoner>(url);
  }

  async getMatchIds(
    puuid: string, 
    region: string, 
    count = 20, 
    startTime?: number, 
    endTime?: number
  ): Promise<string[]> {
    let url = `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`;
    
    if (startTime) {
      url += `&startTime=${startTime}`;
    }
    if (endTime) {
      url += `&endTime=${endTime}`;
    }
    
    return this.makeRequest<string[]>(url);
  }

  async get2025Matches(
    gameName: string,
    tagLine: string
  ): Promise<MatchData[]> {
    try {
      // 2025 timestamps (in seconds)
      const start2025 = Math.floor(new Date('2025-01-01T00:00:00Z').getTime() / 1000);
      const end2025 = Math.floor(new Date('2025-12-31T23:59:59Z').getTime() / 1000);
      
      console.log(`🗓️ Fetching all 2025 matches (${new Date(start2025 * 1000).toLocaleDateString()} - ${new Date(end2025 * 1000).toLocaleDateString()})`);

      // Get account info with region detection
      const account = await this.getAccountByRiotId(gameName, tagLine);
      console.log(`✅ Player found in region: ${account.regionDisplay}`);

      // Try to get matches from all regions for 2025
      let allMatchIds: string[] = [];
      let actualPlayRegion = account.region;

      for (const region of ROUTING_REGIONS) {
        try {
          // Fetch matches in batches to get all 2025 matches
          const regionMatchIds: string[] = [];
          const batchSize = 100; // Max allowed by Riot API
          
          while (true) {
            const batchIds = await this.getMatchIds(
              account.puuid, 
              region, 
              batchSize, 
              start2025, 
              end2025
            );
            
            if (batchIds.length === 0) break;
            
            regionMatchIds.push(...batchIds);
            
            // If we got less than the batch size, we've reached the end
            if (batchIds.length < batchSize) break;
            
            // Rate limiting between batch requests
            await delay(200);
          }

          if (regionMatchIds.length > 0) {
            console.log(`  ✅ Found ${regionMatchIds.length} 2025 matches in ${region}`);
            
            // Use region with most matches
            if (regionMatchIds.length > allMatchIds.length) {
              actualPlayRegion = region;
              allMatchIds = regionMatchIds;
            }
          } else {
            console.log(`  ⚠️  0 2025 matches in ${region}`);
          }
        } catch (error) {
          console.log(`  ⚠️  Error in ${region}:`, (error as Error).message);
        }
      }

      console.log(`📊 Found ${allMatchIds.length} total 2025 match IDs from ${actualPlayRegion}`);

      if (allMatchIds.length === 0) {
        throw new Error('No matches found for 2025. This player may not have played any ranked, normal, or ARAM games in 2025 yet, or their match history may be private.');
      }

      // Get match details with filtering
      const matches: MatchData[] = [];
      
      for (let i = 0; i < allMatchIds.length; i++) {
        try {
          const match = await this.getMatch(allMatchIds[i], actualPlayRegion);
          
          // Verify the match is actually from 2025 (double-check)
          const matchDate = new Date(match.info.gameCreation);
          if (matchDate.getFullYear() !== 2025) {
            console.log(`⏭️ Skipping non-2025 match: ${matchDate.toLocaleDateString()}`);
            continue;
          }
          
          // Smart filtering: only ranked/normal games that lasted >10 minutes
          const queueId = (match.info as RiotMatch['info'] & { queueId?: number }).queueId;
          const gameDuration = match.info.gameDuration;
          
          const isRanked = queueId === 420 || queueId === 440; // Solo/Duo, Flex
          const isNormal = queueId === 400 || queueId === 430; // Draft, Blind
          const isARAM = queueId === 450; // ARAM
          const isValidQueue = isRanked || isNormal || isARAM;
          const isValidDuration = gameDuration >= 600; // >10 minutes (more lenient for year review)

          if (!isValidQueue || !isValidDuration) {
            console.log(`⏭️ Skipping match ${allMatchIds[i]} (Queue: ${queueId}, Duration: ${Math.floor(gameDuration/60)}m)`);
            continue;
          }

          // Find the player's participant data
          const playerParticipant = match.info.participants.find(
            (p) => p.puuid === account.puuid
          );

          if (playerParticipant) {
            const matchData: MatchData = {
              gameId: match.metadata.matchId,
              gameCreation: match.info.gameCreation,
              gameDuration: match.info.gameDuration,
              gameMode: match.info.gameMode,
              gameType: match.info.gameType,
              participants: match.info.participants.map((p) => ({
                summonerName: p.summonerName || (p as RiotParticipant & { riotIdGameName?: string }).riotIdGameName || 'Unknown',
                championId: p.championId,
                championName: p.championName,
                kills: p.kills,
                deaths: p.deaths,
                assists: p.assists,
                totalDamageDealt: p.totalDamageDealtToChampions,
                goldEarned: p.goldEarned,
                win: p.win,
                role: p.teamPosition || p.role,
                lane: p.lane,
              })),
            };
            matches.push(matchData);
          }

          // Rate limiting - wait between requests
          await delay(120);
          
          // Progress logging for large datasets
          if ((i + 1) % 10 === 0) {
            console.log(`📈 Processed ${i + 1}/${allMatchIds.length} matches (${matches.length} valid)`);
          }
        } catch (error: unknown) {
          console.error(`Error fetching match ${allMatchIds[i]}:`, error);
          // Continue with other matches
        }
      }

      console.log(`✅ Successfully fetched ${matches.length} valid 2025 matches`);
      
      // If we have very few 2025 matches, supplement with recent matches for better analysis
      if (matches.length < 10) {
        console.log(`⚠️ Only ${matches.length} 2025 matches found. Supplementing with recent matches for better analysis...`);
        try {
          const recentMatches = await this.getRecentMatches(gameName, tagLine, 30);
          
          // Add recent matches that aren't already included
          const existingMatchIds = new Set(matches.map(m => m.gameId));
          const additionalMatches = recentMatches.filter(m => !existingMatchIds.has(m.gameId));
          
          matches.push(...additionalMatches);
          console.log(`📈 Added ${additionalMatches.length} additional recent matches for analysis`);
        } catch (recentError) {
          console.warn('Could not fetch additional recent matches:', recentError);
        }
      }
      
      return matches;
    } catch (error: unknown) {
      console.error("Error fetching 2025 matches:", error);
      
      // If 2025 fetch fails completely, fall back to recent matches
      console.log("🔄 Falling back to recent matches analysis...");
      try {
        const recentMatches = await this.getRecentMatches(gameName, tagLine, 50);
        console.log(`✅ Fallback: Successfully fetched ${recentMatches.length} recent matches`);
        return recentMatches;
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        throw error; // Throw original error
      }
    }
  }

  async getMatch(matchId: string, region: string): Promise<RiotMatch> {
    const url = `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
    return this.makeRequest<RiotMatch>(url);
  }

  // Helper function to determine platform region from match region
  private getPlatformRegion(matchId: string): string {
    if (matchId.startsWith('NA1_')) return 'na1';
    if (matchId.startsWith('BR1_')) return 'br1';
    if (matchId.startsWith('LA1_')) return 'la1'; // LAN
    if (matchId.startsWith('LA2_')) return 'la2'; // LAS
    if (matchId.startsWith('EUW1_')) return 'euw1';
    if (matchId.startsWith('EUN1_')) return 'eun1';
    if (matchId.startsWith('TR1_')) return 'tr1';
    if (matchId.startsWith('RU_')) return 'ru';
    if (matchId.startsWith('JP1_')) return 'jp1';
    if (matchId.startsWith('KR_')) return 'kr';
    if (matchId.startsWith('OC1_')) return 'oc1';
    if (matchId.startsWith('PH2_')) return 'ph2';
    if (matchId.startsWith('SG2_')) return 'sg2';
    if (matchId.startsWith('TH2_')) return 'th2';
    if (matchId.startsWith('TW2_')) return 'tw2';
    if (matchId.startsWith('VN2_')) return 'vn2';
    if (matchId.startsWith('ME1_')) return 'me1'; // Middle East
    return 'na1'; // default
  }

  async getRecentMatches(
    gameName: string,
    tagLine: string,
    count = 20
  ): Promise<MatchData[]> {
    try {
      // Get account info with region detection
      const account = await this.getAccountByRiotId(gameName, tagLine);
      const routingRegion = account.region;

      console.log(`✅ Player found in region: ${account.regionDisplay}`);

      // Try to get matches from all regions (player might play on different servers)
      let allMatchIds: string[] = [];
      let actualPlayRegion = routingRegion;

      for (const region of ROUTING_REGIONS) {
        try {
          const matchIds = await this.getMatchIds(account.puuid, region, Math.min(count * 2, 100));
          if (matchIds.length > 0) {
            console.log(`  ✅ Found ${matchIds.length} matches in ${region}`);
            
            // Use region with most matches
            if (matchIds.length > allMatchIds.length) {
              actualPlayRegion = region;
              allMatchIds = matchIds;
            }
          } else {
            console.log(`  ⚠️  0 matches in ${region}`);
          }
        } catch (error) {
          console.log(`  ⚠️  Error in ${region}:`, (error as Error).message);
        }
      }

      console.log(`📊 Using ${allMatchIds.length} match IDs from ${actualPlayRegion}`);

      if (allMatchIds.length === 0) {
        throw new Error('No matches found for this player');
      }

      // Get match details with smart filtering
      const matches: MatchData[] = [];
      const recentMatchIds = allMatchIds.slice(0, Math.min(count * 2, 50)); // Get more to filter

      for (let i = 0; i < recentMatchIds.length && matches.length < count; i++) {
        try {
          const match = await this.getMatch(recentMatchIds[i], actualPlayRegion);
          
          // Smart filtering: only ranked/normal games that lasted >15 minutes
          const queueId = (match.info as RiotMatch['info'] & { queueId?: number }).queueId;
          const gameDuration = match.info.gameDuration;
          
          const isRanked = queueId === 420 || queueId === 440; // Solo/Duo, Flex
          const isNormal = queueId === 400 || queueId === 430; // Draft, Blind
          const isValidQueue = isRanked || isNormal;
          const isValidDuration = gameDuration >= 900; // >15 minutes

          if (!isValidQueue || !isValidDuration) {
            console.log(`⏭️ Skipping match ${recentMatchIds[i]} (Queue: ${queueId}, Duration: ${Math.floor(gameDuration/60)}m)`);
            continue;
          }

          // Find the player's participant data
          const playerParticipant = match.info.participants.find(
            (p) => p.puuid === account.puuid
          );

          if (playerParticipant) {
            const matchData: MatchData = {
              gameId: match.metadata.matchId,
              gameCreation: match.info.gameCreation,
              gameDuration: match.info.gameDuration,
              gameMode: match.info.gameMode,
              gameType: match.info.gameType,
              participants: match.info.participants.map((p) => ({
                summonerName: p.summonerName || (p as RiotParticipant & { riotIdGameName?: string }).riotIdGameName || 'Unknown',
                championId: p.championId,
                championName: p.championName,
                kills: p.kills,
                deaths: p.deaths,
                assists: p.assists,
                totalDamageDealt: p.totalDamageDealtToChampions,
                goldEarned: p.goldEarned,
                win: p.win,
                role: p.teamPosition || p.role,
                lane: p.lane,
              })),
            };
            matches.push(matchData);
          }

          // Rate limiting - wait between requests
          await delay(120);
        } catch (error: unknown) {
          console.error(`Error fetching match ${recentMatchIds[i]}:`, error);
          // Continue with other matches
        }
      }

      console.log(`✅ Successfully fetched ${matches.length} valid matches`);
      return matches;
    } catch (error: unknown) {
      console.error("Error fetching matches:", error);
      throw error;
    }
  }
}

export const riotAPI = new RiotAPI();
