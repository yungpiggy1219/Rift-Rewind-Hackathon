import { MatchData, PlayerStats, ChampionStats } from '../types';

export class StatsAggregator {
  /**
   * Aggregate player stats from match history
   */
  static aggregateStats(matches: MatchData[], puuid: string): PlayerStats {
    if (matches.length === 0) {
      return this.getEmptyStats();
    }

    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let totalDamage = 0;
    let totalGameDuration = 0;
    let totalVisionScore = 0;
    let totalWardsPlaced = 0;
    let totalGold = 0;
    let wins = 0;
    const recentForm: boolean[] = [];
    const championMap = new Map<string, { games: number; wins: number; kills: number; deaths: number; assists: number }>();

    matches.forEach((match) => {
      const participant = match.info.participants.find(p => p.puuid === puuid);
      
      if (!participant) return;

      // Basic stats
      totalKills += participant.kills;
      totalDeaths += participant.deaths;
      totalAssists += participant.assists;
      totalDamage += participant.totalDamageDealtToChampions;
      totalGameDuration += match.info.gameDuration;
      totalVisionScore += participant.visionScore;
      totalWardsPlaced += participant.wardsPlaced;
      totalGold += participant.goldEarned;

      if (participant.win) {
        wins++;
      }

      // Recent form (last 10 games)
      if (recentForm.length < 10) {
        recentForm.push(participant.win);
      }

      // Champion stats
      const champData = championMap.get(participant.championName) || {
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
      };

      champData.games++;
      if (participant.win) champData.wins++;
      champData.kills += participant.kills;
      champData.deaths += participant.deaths;
      champData.assists += participant.assists;

      championMap.set(participant.championName, champData);
    });

    const totalGames = matches.length;
    const losses = totalGames - wins;
    const winRate = (wins / totalGames) * 100;
    const avgKills = totalKills / totalGames;
    const avgDeaths = totalDeaths / totalGames;
    const avgAssists = totalAssists / totalGames;
    const avgKDA = avgDeaths > 0 ? (avgKills + avgAssists) / avgDeaths : avgKills + avgAssists;
    const avgGameDurationMinutes = totalGameDuration / totalGames / 60;
    const avgDPM = avgGameDurationMinutes > 0 ? totalDamage / totalGames / avgGameDurationMinutes : 0;
    const avgVisionScore = totalVisionScore / totalGames;
    const avgWardsPlaced = totalWardsPlaced / totalGames;
    const avgGoldPerMinute = avgGameDurationMinutes > 0 ? totalGold / totalGames / avgGameDurationMinutes : 0;

    // Champion stats
    const championStats: ChampionStats[] = Array.from(championMap.entries())
      .map(([championName, data]) => {
        const champKDA = data.deaths > 0 
          ? (data.kills + data.assists) / data.deaths
          : (data.kills + data.assists);
        
        return {
          championName,
          games: data.games,
          wins: data.wins,
          winRate: (data.wins / data.games) * 100,
          avgKDA: champKDA,
        };
      })
      .sort((a, b) => b.games - a.games)
      .slice(0, 5); // Top 5 champions

    return {
      totalGames,
      wins,
      losses,
      winRate: Math.round(winRate * 10) / 10,
      avgKDA: Math.round(avgKDA * 100) / 100,
      avgKills: Math.round(avgKills * 10) / 10,
      avgDeaths: Math.round(avgDeaths * 10) / 10,
      avgAssists: Math.round(avgAssists * 10) / 10,
      avgDPM: Math.round(avgDPM),
      avgVisionScore: Math.round(avgVisionScore * 10) / 10,
      avgWardsPlaced: Math.round(avgWardsPlaced * 10) / 10,
      avgGoldPerMinute: Math.round(avgGoldPerMinute),
      recentForm,
      championStats,
    };
  }

  private static getEmptyStats(): PlayerStats {
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      avgKDA: 0,
      avgKills: 0,
      avgDeaths: 0,
      avgAssists: 0,
      avgDPM: 0,
      avgVisionScore: 0,
      avgWardsPlaced: 0,
      avgGoldPerMinute: 0,
      recentForm: [],
      championStats: [],
    };
  }
}
