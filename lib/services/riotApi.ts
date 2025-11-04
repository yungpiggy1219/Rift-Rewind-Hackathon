import axios from 'axios';
import { MatchData } from '../types';

const RIOT_API_KEY = process.env.RIOT_API_KEY || '';
const REGION = process.env.RIOT_REGION || 'americas';
const PLATFORM = process.env.RIOT_PLATFORM || 'na1';

export class RiotApiService {
  private baseUrl: string;
  private platformUrl: string;

  constructor() {
    this.baseUrl = `https://${REGION}.api.riotgames.com`;
    this.platformUrl = `https://${PLATFORM}.api.riotgames.com`;
  }

  /**
   * Get PUUID by summoner name
   */
  async getPUUID(summonerName: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.platformUrl}/lol/summoner/v4/summoners/by-name/${encodeURIComponent(summonerName)}`,
        {
          headers: {
            'X-Riot-Token': RIOT_API_KEY,
          },
        }
      );
      return response.data.puuid;
    } catch (error) {
      const err = error as { response?: { data?: { status?: { message?: string } } }; message: string };
      throw new Error(`Failed to get PUUID: ${err.response?.data?.status?.message || err.message}`);
    }
  }

  /**
   * Get match IDs for a player
   */
  async getMatchIds(puuid: string, count: number = 20): Promise<string[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids`,
        {
          params: {
            start: 0,
            count: count,
          },
          headers: {
            'X-Riot-Token': RIOT_API_KEY,
          },
        }
      );
      return response.data;
    } catch (error) {
      const err = error as { response?: { data?: { status?: { message?: string } } }; message: string };
      throw new Error(`Failed to get match IDs: ${err.response?.data?.status?.message || err.message}`);
    }
  }

  /**
   * Get match data by match ID
   */
  async getMatchData(matchId: string): Promise<MatchData> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/lol/match/v5/matches/${matchId}`,
        {
          headers: {
            'X-Riot-Token': RIOT_API_KEY,
          },
        }
      );
      return response.data;
    } catch (error) {
      const err = error as { response?: { data?: { status?: { message?: string } } }; message: string };
      throw new Error(`Failed to get match data: ${err.response?.data?.status?.message || err.message}`);
    }
  }

  /**
   * Get multiple match data
   */
  async getMatchHistory(puuid: string, count: number = 20): Promise<MatchData[]> {
    const matchIds = await this.getMatchIds(puuid, count);
    const matchDataPromises = matchIds.map(matchId => this.getMatchData(matchId));
    
    // Fetch all matches with error handling
    const results = await Promise.allSettled(matchDataPromises);
    return results
      .filter((result): result is PromiseFulfilledResult<MatchData> => result.status === 'fulfilled')
      .map(result => result.value);
  }
}
