import { ScenePayload, MatchParticipant } from '../types';
import { fetchMatchDetailFromCache } from '../riot';

interface MonthlyStats {
  month: number;
  damageToChampions: number[];
  goldPerMinute: number[];
  wins: number;
  games: number;
}

// Type guard to check if participant is a MatchParticipant
function isMatchParticipant(participant: MatchParticipant | { puuid: string; riotIdGameName: string }): participant is MatchParticipant {
  return 'goldEarned' in participant && 'win' in participant;
}

export async function computeGrowth(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeGrowth] Starting for ${ctx.puuid} - TRACKING GROWTH OVER TIME`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeGrowth] Using ${matchIds.length} cached match IDs`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Track monthly statistics
    const monthlyData = new Map<number, MonthlyStats>();
    
    // Initialize all 12 months
    for (let m = 1; m <= 12; m++) {
      monthlyData.set(m, {
        month: m,
        damageToChampions: [],
        goldPerMinute: [],
        wins: 0,
        games: 0
      });
    }
    
    let totalDamageToChampions = 0;
    let totalGoldEarned = 0;
    let totalGameDuration = 0;
    let totalWins = 0;
    let processedMatches = 0;
    
    // Process matches in batches
    const batchSize = 10;
    
    for (let i = 0; i < matchIds.length; i += batchSize) {
      const batch = matchIds.slice(i, i + batchSize);
      
      const matchPromises = batch.map(async (matchId) => {
        try {
          return await fetchMatchDetailFromCache(matchId);
        } catch (error) {
          console.warn(`Failed to fetch match ${matchId}:`, error);
          return null;
        }
      });
      
      const matches = await Promise.all(matchPromises);
      
      for (const match of matches) {
        if (!match) continue;
        
        // Find player's participant data
        const playerParticipant = match.participants.find(p => p.puuid === ctx.puuid);
        if (!playerParticipant || !isMatchParticipant(playerParticipant)) continue;
        
        processedMatches++;
        
        // Get match month (1-12)
        const matchDate = new Date(match.gameCreation || Date.now());
        const month = matchDate.getMonth() + 1; // 0-indexed, so add 1
        
        // Extract statistics
        const damageToChampions = playerParticipant.totalDamageDealtToChampions || 0;
        const goldEarned = playerParticipant.goldEarned || 0;
        const gameDuration = match.gameDuration || 1;
        const won = playerParticipant.win || false;
        
        // Calculate GPM for this match
        const goldPerMinute = Math.round((goldEarned / gameDuration) * 60);
        
        // Update monthly stats
        const monthStats = monthlyData.get(month);
        if (monthStats) {
          monthStats.damageToChampions.push(damageToChampions);
          monthStats.goldPerMinute.push(goldPerMinute);
          monthStats.games++;
          if (won) monthStats.wins++;
        }
        
        // Update totals
        totalDamageToChampions += damageToChampions;
        totalGoldEarned += goldEarned;
        totalGameDuration += gameDuration;
        if (won) totalWins++;
      }
      
      // Small delay between batches
      if (i + batchSize < matchIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    if (processedMatches === 0) {
      throw new Error('No match data processed');
    }
    
    // Calculate overall averages
    const avgDamageToChampions = Math.round(totalDamageToChampions / processedMatches);
    const avgGoldPerMinute = Math.round((totalGoldEarned / totalGameDuration) * 60);
    const overallWinRate = Math.round((totalWins / processedMatches) * 100);
    
    console.log(`[computeGrowth] Processed ${processedMatches} matches`);
    console.log(`[computeGrowth] Overall win rate: ${overallWinRate}%`);
    console.log(`[computeGrowth] Average damage to champions: ${avgDamageToChampions.toLocaleString()}`);
    console.log(`[computeGrowth] Average GPM: ${avgGoldPerMinute}`);
    
    // Build time series data for the chart
    const damageOverTime: { month: number; value: number }[] = [];
    const gpmOverTime: { month: number; value: number }[] = [];
    const winRateOverTime: { month: number; value: number }[] = [];
    
    // Calculate monthly averages
    for (let month = 1; month <= 12; month++) {
      const stats = monthlyData.get(month);
      if (!stats || stats.games === 0) {
        // No data for this month - skip or use 0
        continue;
      }
      
      // Calculate average damage for the month
      const avgMonthDamage = stats.damageToChampions.length > 0
        ? Math.round(stats.damageToChampions.reduce((a, b) => a + b, 0) / stats.damageToChampions.length)
        : 0;
      
      // Calculate average GPM for the month
      const avgMonthGPM = stats.goldPerMinute.length > 0
        ? Math.round(stats.goldPerMinute.reduce((a, b) => a + b, 0) / stats.goldPerMinute.length)
        : 0;
      
      // Calculate win rate for the month
      const monthWinRate = stats.games > 0
        ? Math.round((stats.wins / stats.games) * 100)
        : 0;
      
      damageOverTime.push({ month, value: avgMonthDamage });
      gpmOverTime.push({ month, value: avgMonthGPM });
      winRateOverTime.push({ month, value: monthWinRate });
    }
    
    // Determine growth trend
    let growthTrend = "Stable";
    let growthDescription = "";
    
    if (damageOverTime.length >= 2) {
      const firstHalfDamage = damageOverTime.slice(0, Math.floor(damageOverTime.length / 2));
      const secondHalfDamage = damageOverTime.slice(Math.floor(damageOverTime.length / 2));
      
      const avgFirstHalf = firstHalfDamage.reduce((a, b) => a + b.value, 0) / firstHalfDamage.length;
      const avgSecondHalf = secondHalfDamage.reduce((a, b) => a + b.value, 0) / secondHalfDamage.length;
      
      const improvement = ((avgSecondHalf - avgFirstHalf) / avgFirstHalf) * 100;
      
      if (improvement > 10) {
        growthTrend = "Improving";
        growthDescription = `Your damage output has increased by ${improvement.toFixed(1)}% over the year!`;
      } else if (improvement < -10) {
        growthTrend = "Declining";
        growthDescription = `Your damage output has decreased by ${Math.abs(improvement).toFixed(1)}%. Consider reviewing your champion picks and playstyle.`;
      } else {
        growthTrend = "Consistent";
        growthDescription = "You've maintained a stable performance throughout the year.";
      }
    }
    
    return {
      sceneId: "growth_over_time",
      vizKind: "line",
      insight: {
        summary: `${growthTrend} Performance: ${overallWinRate}% win rate across ${processedMatches} games with ${avgDamageToChampions.toLocaleString()} avg damage.`,
        details: [
          `Overall win rate: ${overallWinRate}% (${totalWins} wins / ${processedMatches} games)`,
          `Average damage to champions: ${avgDamageToChampions.toLocaleString()} per game`,
          `Average gold per minute: ${avgGoldPerMinute} GPM`,
          growthDescription,
          `Played consistently across ${damageOverTime.length} months`
        ],
        action: growthTrend === "Improving" 
          ? "Keep up the great work! Your improvement is showing."
          : growthTrend === "Declining"
          ? "Consider practicing your core champions and reviewing your gameplay."
          : "Challenge yourself to improve your damage output and efficiency.",
        metrics: [
          {
            label: "Win Rate",
            value: overallWinRate,
            unit: "%",
            context: `${totalWins}/${processedMatches} games`
          },
          {
            label: "Avg Damage",
            value: Math.round(avgDamageToChampions / 1000),
            unit: "K",
            context: "per game"
          },
          {
            label: "Avg Gold/Min",
            value: avgGoldPerMinute,
            unit: "",
            context: "farming efficiency"
          },
          {
            label: "Trend",
            value: growthTrend,
            unit: "",
            context: "over the year"
          }
        ],
        vizData: {
          type: "growth_statistics",
          series: [
            {
              name: "Damage to Champions",
              data: damageOverTime,
              color: "#EF4444"
            },
            {
              name: "Gold Per Minute",
              data: gpmOverTime,
              color: "#F59E0B"
            },
            {
              name: "Win Rate %",
              data: winRateOverTime,
              color: "#10B981"
            }
          ]
        }
      }
    };
    
  } catch (error) {
    console.error('Error in computeGrowth:', error);
    
    // Fallback to mock data if real data fails
    return {
      sceneId: "growth_over_time",
      vizKind: "line",
      insight: {
        summary: "Unable to load growth statistics. Using sample data for demonstration.",
        details: [
          "Could not fetch your detailed match statistics",
          "This might be due to API limitations or no recent matches",
          "Sample data shown for demonstration purposes"
        ],
        action: "Play some games and try again later",
        metrics: [
          { label: "Win Rate", value: 0, unit: "%" },
          { label: "Avg Damage", value: 0, unit: "K" },
          { label: "Avg Gold/Min", value: 0, unit: "" },
          { label: "Trend", value: "N/A", unit: "" }
        ],
        vizData: {
          type: "growth_statistics",
          series: []
        }
      }
    };
  }
}