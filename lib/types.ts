// League of Legends data types
export interface MatchData {
  gameId: string;
  gameCreation: number;
  gameDuration: number;
  gameMode: string;
  gameType: string;
  participants: Participant[];
}

export interface Participant {
  summonerName: string;
  championId: number;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealt: number;
  goldEarned: number;
  win: boolean;
  role: string;
  lane: string;
}

export interface PlayerInsights {
  playerId: string;
  totalGames: number;
  winRate: number;
  favoriteChampions: ChampionStats[];
  performanceTrends: PerformanceTrend[];
  strengths: string[];
  improvementAreas: string[];
  yearEndSummary: YearEndSummary;
}

export interface ChampionStats {
  championName: string;
  gamesPlayed: number;
  winRate: number;
  avgKDA: number;
}

export interface PerformanceTrend {
  month: string;
  winRate: number;
  avgKDA: number;
  gamesPlayed: number;
}

export interface YearEndSummary {
  totalGames: number;
  bestMonth: string;
  mostImprovedSkill: string;
  favoriteRole: string;
  biggestAchievement: string;
  funFacts: string[];
}