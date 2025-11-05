// Core Scene Types
export type SceneId = 
  | "year_in_motion" 
  | "signature_style" 
  | "growth_over_time" 
  | "peak_performance" 
  | "weaknesses" 
  | "allies" 
  | "aram" 
  | "social_comparison" 
  | "legacy" 
  | "path_forward";

export interface SceneMetric {
  label: string;
  value: number | string;
  unit?: string;
  trend?: "up" | "down" | "stable";
  context?: string;
}

export interface SceneInsight {
  summary: string;
  details: string[];
  action: string;
  metrics: SceneMetric[];
  vizData: any;
}

export interface ScenePayload {
  sceneId: SceneId;
  insight: SceneInsight;
}

// Agent Types
export type AgentId = "velkoz" | "teemo" | "heimer" | "kayle" | "draven";

export interface AgentPersona {
  id: AgentId;
  name: string;
  title: string;
  personality: string;
  tone: string;
  catchphrases: string[];
  voiceStyle: string;
}

export interface NarrationRequest {
  agentId: AgentId;
  sceneId: SceneId;
  insight: SceneInsight;
  playerName?: string;
}

export interface NarrationResponse {
  title: string;
  opening: string;
  analysis: string;
  actionable: string;
  tags?: string[];
}

// Riot API Types
export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
  region: string;
}

export interface MatchParticipant {
  puuid: string;
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

export interface MatchData {
  gameId: string;
  gameCreation: number;
  gameDuration: number;
  gameMode: string;
  gameType: string;
  participants: MatchParticipant[];
}

// Aggregated Data Types
export interface PlayerAggregates {
  timeframe: {
    start: string;
    end: string;
  };
  totals: {
    matches: number;
    hours: number;
  };
  months: {
    [key: string]: {
      matches: number;
      hours: number;
    };
  };
  gpm: {
    start: number;
    end: number;
    deltaPct: number;
    series: number[];
  };
  kda: {
    start: number;
    end: number;
    trendSlope: number;
    series: number[];
  };
  winRate: {
    start: number;
    end: number;
    deltaPct: number;
    series: number[];
  };
  peak: {
    date: string;
    kills: number;
    deaths: number;
    assists: number;
    gpm: number;
    matchId: string;
  };
}

// Viz Types
export type VizKind = 
  | "heatmap" 
  | "radar" 
  | "line" 
  | "highlight" 
  | "bar" 
  | "badge" 
  | "infographic" 
  | "goal";

// Legacy types for compatibility
export interface PlayerInsights {
  totalGames: number;
  winRate: number;
  favoriteChampions: Array<{
    championName: string;
    games: number;
    winRate: number;
  }>;
  yearEndSummary: {
    favoriteRole: string;
  };
}