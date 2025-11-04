import { MatchData, PlayerInsights } from './types';

// Mock League match data for development
export const mockMatches: MatchData[] = [
  {
    gameId: "match_001",
    gameCreation: Date.now() - 86400000, // 1 day ago
    gameDuration: 1800, // 30 minutes
    gameMode: "CLASSIC",
    gameType: "MATCHED_GAME",
    participants: [
      {
        summonerName: "TestPlayer",
        championId: 157,
        championName: "Yasuo",
        kills: 12,
        deaths: 3,
        assists: 8,
        totalDamageDealt: 45000,
        goldEarned: 15000,
        win: true,
        role: "MIDDLE",
        lane: "MIDDLE"
      }
    ]
  },
  // Add more mock matches...
];

export const mockPlayerInsights: PlayerInsights = {
  playerId: "test_player_123",
  totalGames: 150,
  winRate: 0.64,
  favoriteChampions: [
    { championName: "Yasuo", gamesPlayed: 25, winRate: 0.68, avgKDA: 2.1 },
    { championName: "Zed", gamesPlayed: 20, winRate: 0.70, avgKDA: 2.3 },
    { championName: "Azir", gamesPlayed: 18, winRate: 0.61, avgKDA: 1.9 }
  ],
  performanceTrends: [
    { month: "Jan", winRate: 0.58, avgKDA: 1.8, gamesPlayed: 20 },
    { month: "Feb", winRate: 0.62, avgKDA: 2.0, gamesPlayed: 25 },
    { month: "Mar", winRate: 0.66, avgKDA: 2.2, gamesPlayed: 30 }
  ],
  strengths: [
    "Excellent mechanical skill on assassin champions",
    "Strong mid-game teamfighting",
    "Good vision control"
  ],
  improvementAreas: [
    "Early game laning phase",
    "Objective control timing",
    "Champion pool diversity"
  ],
  yearEndSummary: {
    totalGames: 150,
    bestMonth: "March",
    mostImprovedSkill: "Teamfighting",
    favoriteRole: "Mid Lane",
    biggestAchievement: "Reached Gold rank for the first time!",
    funFacts: [
      "You played 15 different champions this year",
      "Your longest winning streak was 8 games",
      "You dealt over 2 million damage to champions"
    ]
  }
};