import { MatchData, PlayerInsights, ChampionStats, PerformanceTrend, YearEndSummary, Participant } from './types';

interface PlayerMatchData {
  match: MatchData;
  player: Participant;
}

export class MatchAnalyzer {
  static analyzeMatches(matches: MatchData[], playerName: string): PlayerInsights {
    if (matches.length === 0) {
      throw new Error('No matches to analyze');
    }

    // Find player data in each match
    const playerMatches: PlayerMatchData[] = matches.map(match => {
      const player = match.participants.find(p => 
        p.riotIdGameName.toLowerCase() === playerName.toLowerCase() ||
        p.riotIdGameName.toLowerCase().includes(playerName.split('#')[0].toLowerCase())
      );
      return { match, player: player! };
    }).filter(({ player }) => player !== undefined);

    if (playerMatches.length === 0) {
      throw new Error(`No matches found for player: ${playerName}. Please check the game name and tag line.`);
    }

    const totalGames = playerMatches.length;
    const wins = playerMatches.filter(({ player }) => player.win).length;
    const winRate = wins / totalGames;

    // Analyze champion performance
    const championStats = this.analyzeChampions(playerMatches);
    
    // Analyze performance trends (by month)
    const performanceTrends = this.analyzePerformanceTrends(playerMatches);
    
    // Generate insights
    const strengths = this.identifyStrengths(playerMatches, championStats);
    const improvementAreas = this.identifyImprovementAreas(playerMatches, championStats);
    
    // Generate year-end summary
    const yearEndSummary = this.generateYearEndSummary(playerMatches, championStats);

    return {
      playerId: playerName,
      totalGames,
      winRate,
      favoriteChampions: championStats.slice(0, 5), // Top 5 champions
      performanceTrends,
      strengths,
      improvementAreas,
      yearEndSummary,
    };
  }

  private static analyzeChampions(playerMatches: PlayerMatchData[]): ChampionStats[] {
    const championMap = new Map<string, {
      games: number;
      wins: number;
      totalKDA: number;
    }>();

    playerMatches.forEach(({ player }) => {
      const champ = player.championName;
      const kda = (player.kills + player.assists) / Math.max(player.deaths, 1);
      
      if (!championMap.has(champ)) {
        championMap.set(champ, { games: 0, wins: 0, totalKDA: 0 });
      }
      
      const stats = championMap.get(champ)!;
      stats.games++;
      stats.totalKDA += kda;
      if (player.win) stats.wins++;
    });

    return Array.from(championMap.entries())
      .map(([championName, stats]) => ({
        championName,
        gamesPlayed: stats.games,
        winRate: stats.wins / stats.games,
        avgKDA: stats.totalKDA / stats.games,
      }))
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed);
  }

  private static analyzePerformanceTrends(playerMatches: PlayerMatchData[]): PerformanceTrend[] {
    const monthlyStats = new Map<string, {
      games: number;
      wins: number;
      totalKDA: number;
    }>();

    playerMatches.forEach(({ match, player }) => {
      const date = new Date(match.gameCreation);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      const kda = (player.kills + player.assists) / Math.max(player.deaths, 1);
      
      if (!monthlyStats.has(monthKey)) {
        monthlyStats.set(monthKey, { games: 0, wins: 0, totalKDA: 0 });
      }
      
      const stats = monthlyStats.get(monthKey)!;
      stats.games++;
      stats.totalKDA += kda;
      if (player.win) stats.wins++;
    });

    return Array.from(monthlyStats.entries())
      .map(([month, stats]) => ({
        month,
        winRate: stats.wins / stats.games,
        avgKDA: stats.totalKDA / stats.games,
        gamesPlayed: stats.games,
      }))
      .sort((a, b) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.indexOf(a.month) - months.indexOf(b.month);
      });
  }

  private static identifyStrengths(playerMatches: PlayerMatchData[], championStats: ChampionStats[]): string[] {
    const strengths: string[] = [];
    
    // High win rate
    const avgWinRate = playerMatches.filter(({ player }) => player.win).length / playerMatches.length;
    if (avgWinRate > 0.6) {
      strengths.push(`Strong overall performance with ${Math.round(avgWinRate * 100)}% win rate`);
    }

    // Good KDA
    const avgKDA = playerMatches.length > 0 
      ? playerMatches.reduce((sum, { player }) => {
          return sum + (player.kills + player.assists) / Math.max(player.deaths, 1);
        }, 0) / playerMatches.length
      : 0;
    
    if (avgKDA > 2.0) {
      strengths.push(`Excellent KDA ratio averaging ${avgKDA.toFixed(1)}`);
    }

    // Champion mastery
    const topChamp = championStats[0];
    if (topChamp && topChamp.winRate > 0.65) {
      strengths.push(`Strong mastery of ${topChamp.championName} with ${Math.round(topChamp.winRate * 100)}% win rate`);
    }

    // Damage dealing
    const avgDamage = playerMatches.length > 0 
      ? playerMatches.reduce((sum, { player }) => sum + player.totalDamageDealt, 0) / playerMatches.length
      : 0;
    if (avgDamage > 20000) {
      strengths.push('High damage output in team fights');
    }

    return strengths.length > 0 ? strengths : ['Consistent gameplay and steady improvement'];
  }

  private static identifyImprovementAreas(playerMatches: PlayerMatchData[], championStats: ChampionStats[]): string[] {
    const improvements: string[] = [];
    
    // Low win rate
    const avgWinRate = playerMatches.filter(({ player }) => player.win).length / playerMatches.length;
    if (avgWinRate < 0.5) {
      improvements.push('Focus on game fundamentals to improve win rate');
    }

    // High death rate
    const avgDeaths = playerMatches.length > 0 
      ? playerMatches.reduce((sum, { player }) => sum + player.deaths, 0) / playerMatches.length
      : 0;
    if (avgDeaths > 6) {
      improvements.push('Work on positioning and map awareness to reduce deaths');
    }

    // Champion pool diversity
    if (championStats.length < 5) {
      improvements.push('Expand champion pool for better draft flexibility');
    }

    // Low damage
    const avgDamage = playerMatches.length > 0 
      ? playerMatches.reduce((sum, { player }) => sum + player.totalDamageDealt, 0) / playerMatches.length
      : 0;
    if (avgDamage < 15000) {
      improvements.push('Focus on trading and team fight positioning to increase damage output');
    }

    return improvements.length > 0 ? improvements : ['Continue practicing to maintain your strong performance'];
  }

  private static generateYearEndSummary(playerMatches: PlayerMatchData[], championStats: ChampionStats[]): YearEndSummary {
    const totalGames = playerMatches.length;
    const topChampion = championStats[0];
    
    // Find best performing month
    const monthlyPerformance = this.analyzePerformanceTrends(playerMatches);
    const bestMonth = monthlyPerformance.length > 0 
      ? monthlyPerformance.reduce((best, current) => 
          current.winRate > best.winRate ? current : best
        ).month
      : 'Unknown';

    // Calculate total damage
    const totalDamage = playerMatches.length > 0 
      ? playerMatches.reduce((sum, { player }) => sum + player.totalDamageDealt, 0)
      : 0;
    
    // Find longest win streak
    let currentStreak = 0;
    let longestStreak = 0;
    playerMatches.forEach(({ player }) => {
      if (player.win) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    const funFacts = [
      `You played ${championStats.length} different champions this year`,
      `Your longest winning streak was ${longestStreak} games`,
      `You dealt ${Math.round(totalDamage / 1000000)}M total damage to champions`,
      `Your favorite champion was ${topChampion?.championName || 'Unknown'} with ${topChampion?.gamesPlayed || 0} games`,
    ];

    return {
      totalGames,
      bestMonth,
      mostImprovedSkill: 'Teamfighting', // This could be more sophisticated
      favoriteRole: this.getMostPlayedRole(playerMatches),
      biggestAchievement: longestStreak > 5 ? `${longestStreak}-game winning streak!` : 'Consistent improvement throughout the year',
      funFacts,
    };
  }

  private static getMostPlayedRole(playerMatches: PlayerMatchData[]): string {
    const roleCount = new Map<string, number>();
    
    playerMatches.forEach(({ player }) => {
      const role = player.role || 'Unknown';
      roleCount.set(role, (roleCount.get(role) || 0) + 1);
    });

    if (roleCount.size === 0) {
      return 'Unknown';
    }
    
    const mostPlayedRole = Array.from(roleCount.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    return mostPlayedRole ? mostPlayedRole[0] : 'Unknown';
  }
}