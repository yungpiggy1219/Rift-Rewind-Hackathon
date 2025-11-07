import { ScenePayload } from '../types';
import { fetchMatchDetail } from '../riot';

export async function computeGoldShare(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeGoldShare] Starting for ${ctx.puuid} - ANALYZING GOLD STATISTICS`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeGoldShare] Using ${matchIds.length} cached match IDs`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Initialize tracking variables
    let totalGoldEarned = 0;
    let totalGoldSpent = 0;
    let processedMatches = 0;
    
    // Track gold per minute by month
    const monthlyGoldPerMinute: Record<number, { total: number; count: number }> = {};
    
    // Initialize all months (1-12)
    for (let i = 1; i <= 12; i++) {
      monthlyGoldPerMinute[i] = { total: 0, count: 0 };
    }
    
    // Process matches in batches
    const batchSize = 10;
    
    for (let i = 0; i < matchIds.length; i += batchSize) {
      const batch = matchIds.slice(i, i + batchSize);
      
      const matchPromises = batch.map(async (matchId) => {
        try {
          return await fetchMatchDetail(matchId);
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
        if (!playerParticipant || !('championId' in playerParticipant)) continue;
        
        processedMatches++;
        
        // Extract gold stats
        const goldEarned = playerParticipant.goldEarned || 0;
        const goldSpent = playerParticipant.goldSpent || 0;
        
        // Calculate gold per minute for this match
        const gameDurationMinutes = match.gameDuration / 60;
        const goldPerMinute = gameDurationMinutes > 0 ? goldEarned / gameDurationMinutes : 0;
        
        // Get month from game creation date
        const matchDate = new Date(match.gameCreation || Date.now());
        const month = matchDate.getMonth() + 1; // 1-12
        
        // Accumulate totals
        totalGoldEarned += goldEarned;
        totalGoldSpent += goldSpent;
        
        // Track monthly gold per minute
        monthlyGoldPerMinute[month].total += goldPerMinute;
        monthlyGoldPerMinute[month].count += 1;
      }
      
      // Small delay between batches
      if (i + batchSize < matchIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    if (processedMatches === 0) {
      throw new Error('No match data processed');
    }
    
    // Calculate averages
    const avgGoldEarned = Math.round(totalGoldEarned / processedMatches);
    const avgGoldSpent = Math.round(totalGoldSpent / processedMatches);
    
    // Calculate overall average gold per minute from all matches
    let totalGPM = 0;
    let gpmCount = 0;
    Object.values(monthlyGoldPerMinute).forEach(month => {
      totalGPM += month.total;
      gpmCount += month.count;
    });
    const overallAvgGoldPerMinute = gpmCount > 0 ? Math.round(totalGPM / gpmCount) : 0;
    
    // Prepare monthly data for chart
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const chartData = monthNames.map((name, index) => {
      const monthNum = index + 1;
      const monthData = monthlyGoldPerMinute[monthNum];
      const avgGPM = monthData.count > 0 ? Math.round(monthData.total / monthData.count) : 0;
      return {
        month: name,
        goldPerMinute: avgGPM,
        gamesPlayed: monthData.count
      };
    });
    
    // Calculate gold efficiency
    const goldEfficiency = totalGoldEarned > 0 
      ? (totalGoldSpent / totalGoldEarned) * 100 
      : 0;
    
    // Determine farming efficiency based on GPM
    const farmingLevel = overallAvgGoldPerMinute > 400 
      ? "Excellent" 
      : overallAvgGoldPerMinute > 350 
        ? "Good" 
        : overallAvgGoldPerMinute > 300 
          ? "Average" 
          : "Needs Improvement";
    
    console.log(`[computeGoldShare] Processed ${processedMatches} matches`);
    console.log(`[computeGoldShare] Total gold earned: ${totalGoldEarned.toLocaleString()}`);
    console.log(`[computeGoldShare] Average gold per minute: ${overallAvgGoldPerMinute}`);
    
    return {
      sceneId: "gold_share",
      vizKind: "line",
      insight: {
        summary: `${totalGoldEarned.toLocaleString()} total gold earned across ${processedMatches} games with an average of ${overallAvgGoldPerMinute} gold per minute.`,
        details: [
          `Total gold earned: ${totalGoldEarned.toLocaleString()} (avg: ${avgGoldEarned.toLocaleString()}/game)`,
          `Total gold spent: ${totalGoldSpent.toLocaleString()} (avg: ${avgGoldSpent.toLocaleString()}/game)`,
          `Gold efficiency: ${goldEfficiency.toFixed(1)}% (spent vs earned)`,
          `Average gold per minute: ${overallAvgGoldPerMinute} GPM`,
          `Farming level: ${farmingLevel}`,
          overallAvgGoldPerMinute > 350 
            ? "You're farming efficiently - keep up the good work!" 
            : "Focus on last-hitting minions and participating in objectives to improve gold income"
        ],
        action: overallAvgGoldPerMinute > 400 
          ? "Outstanding gold generation! You're maximizing your income effectively."
          : overallAvgGoldPerMinute > 300 
            ? "Solid gold income. Work on improving CS and objective participation."
            : "Focus on farming fundamentals - aim for 6+ CS per minute to boost your gold income.",
        metrics: [
          {
            label: "Total Gold Earned",
            value: Math.round(totalGoldEarned / 1000),
            unit: "K",
            context: `${avgGoldEarned.toLocaleString()} avg/game`
          },
          {
            label: "Total Gold Spent",
            value: Math.round(totalGoldSpent / 1000),
            unit: "K",
            context: `${goldEfficiency.toFixed(1)}% efficiency`
          },
          {
            label: "Average Gold Per Minute",
            value: overallAvgGoldPerMinute,
            unit: " GPM",
            context: farmingLevel
          },
          {
            label: "Games Analyzed",
            value: processedMatches,
            unit: ""
          }
        ],
        vizData: {
          type: "gold_statistics",
          totalGoldEarned,
          totalGoldSpent,
          goldEfficiency,
          averages: {
            avgGoldEarned,
            avgGoldSpent,
            avgGoldPerMinute: overallAvgGoldPerMinute
          },
          farmingLevel,
          // Line chart data for gold per minute by month
          chartData,
          series: [
            {
              name: "Gold Per Minute",
              data: chartData.map(d => ({
                x: d.month,
                y: d.goldPerMinute,
                gamesPlayed: d.gamesPlayed
              })),
              color: "#F59E0B"
            }
          ],
          // Benchmarks for comparison
          benchmarks: {
            excellent: 400,
            good: 350,
            average: 300,
            poor: 250
          }
        }
      }
    };
    
  } catch (error) {
    console.error('Error in computeGoldShare:', error);
    
    // Fallback to mock data if real data fails
    return {
      sceneId: "gold_share",
      vizKind: "line",
      insight: {
        summary: "Unable to load gold statistics. Using sample data for demonstration.",
        details: [
          "Could not fetch your gold statistics",
          "This might be due to API limitations or no recent matches",
          "Sample data shown for demonstration purposes"
        ],
        action: "Play some games and try again later",
        metrics: [
          { label: "Total Gold Earned", value: 0, unit: "K" },
          { label: "Total Gold Spent", value: 0, unit: "K" },
          { label: "Average Gold Per Minute", value: 0, unit: " GPM" },
          { label: "Games Analyzed", value: 0, unit: "" }
        ],
        vizData: {
          type: "gold_statistics",
          chartData: [],
          series: []
        }
      }
    };
  }
}
