// League of Legends API types
export interface MatchData {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameMode: string;
    participants: Participant[];
  };
}

export interface Participant {
  puuid: string;
  summonerName: string;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  visionScore: number;
  win: boolean;
  wardsPlaced: number;
  wardsKilled: number;
  goldEarned: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
}

// Aggregated stats
export interface PlayerStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  avgKDA: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgDPM: number; // Damage per minute
  avgVisionScore: number;
  avgWardsPlaced: number;
  avgGoldPerMinute: number;
  recentForm: boolean[]; // Last 10 games (true = win, false = loss)
  championStats: ChampionStats[];
}

export interface ChampionStats {
  championName: string;
  games: number;
  wins: number;
  winRate: number;
  avgKDA: number;
}

// API response type
export interface InsightsResponse {
  success: boolean;
  stats?: PlayerStats;
  aiRecap?: string;
  error?: string;
}
