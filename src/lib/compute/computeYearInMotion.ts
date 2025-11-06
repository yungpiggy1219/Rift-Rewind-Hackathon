import { ScenePayload, MatchData } from '../types';
import { fetchMatchDetail } from '../riot';

export async function computeYearInMotion(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeYearInMotion] Starting for ${ctx.puuid} - CALCULATING REAL STATS`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeYearInMotion] Using ${matchIds.length} cached match IDs`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Step 2: Fetch match details for analysis
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyHours: Record<string, number> = {};
    let totalMatches = 0;
    let totalSeconds = 0;
    let bestKDA = { kda: 0, kills: 0, deaths: 0, assists: 0, matchId: '', date: '' };
    
    // Process matches in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < matchIds.length; i += batchSize) {
      const batch = matchIds.slice(i, i + batchSize);
      
      const matchPromises = batch.map(async (matchId) => {
        try {
          // Use cached data directly via fetchMatchDetail
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
        if (!playerParticipant) continue;
        
        totalMatches++;
        totalSeconds += match.gameDuration || 0;
        
        // Calculate monthly hours
        const matchDate = new Date(match.gameCreation || Date.now());
        const monthKey = monthNames[matchDate.getMonth()];
        const hours = (match.gameDuration || 0) / 3600;
        
        if (!monthlyHours[monthKey]) {
          monthlyHours[monthKey] = 0;
        }
        monthlyHours[monthKey] += hours;
        
        // Calculate KDA for this match
        const { kills, deaths, assists } = playerParticipant;
        const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths;
        
        if (kda > bestKDA.kda) {
          bestKDA = {
            kda,
            kills,
            deaths,
            assists,
            matchId: match.gameId,
            date: matchDate.toLocaleDateString()
          };
        }
      }
      
      // Small delay between batches to be nice to the API
      if (i + batchSize < matchIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const totalHours = totalSeconds / 3600;
    
    // Find peak month
    let peakMonth = 'N/A';
    let peakHours = 0;
    
    for (const [month, hours] of Object.entries(monthlyHours)) {
      if (hours > peakHours) {
        peakHours = hours;
        peakMonth = month;
      }
    }
    
    console.log(`[computeYearInMotion] Processed ${totalMatches} matches, ${totalHours.toFixed(1)} hours total`);
    console.log(`[computeYearInMotion] Best KDA: ${bestKDA.kda.toFixed(2)} (${bestKDA.kills}/${bestKDA.deaths}/${bestKDA.assists})`);
    
    return {
      sceneId: "year_in_motion",
      vizKind: "heatmap",
      insight: {
        summary: `${totalMatches} matches. ${Math.round(totalHours)} hours of League. ${peakMonth} was your peak month.`,
        details: [
          `You played ${totalMatches} matches in 2025`,
          `Total time invested: ${Math.round(totalHours)} hours`,
          `Peak activity: ${peakMonth} with ${Math.round(peakHours)} hours played`,
          `Best KDA: ${bestKDA.kda.toFixed(2)} (${bestKDA.kills}/${bestKDA.deaths}/${bestKDA.assists}) on ${bestKDA.date}`
        ],
        action: "Your dedication to the Rift shows - keep climbing!",
        metrics: [
          {
            label: "Total Matches",
            value: totalMatches,
            unit: ""
          },
          {
            label: "Time Invested", 
            value: Math.round(totalHours),
            unit: " hours"
          },
          {
            label: "Peak Month",
            value: peakMonth,
            context: `${Math.round(peakHours)} hours`
          },
          {
            label: "Best KDA",
            value: bestKDA.kda.toFixed(1),
            context: `${bestKDA.kills}/${bestKDA.deaths}/${bestKDA.assists}`
          }
        ],
        vizData: {
          type: "year_stats",
          totalMatches,
          totalHours: Math.round(totalHours),
          peakMonth,
          peakHours: Math.round(peakHours),
          monthlyHours,
          bestKDA: {
            value: bestKDA.kda,
            kills: bestKDA.kills,
            deaths: bestKDA.deaths,
            assists: bestKDA.assists,
            date: bestKDA.date
          },
          // Format data for heatmap visualization
          months: Object.entries(monthlyHours).map(([month, hours]) => {
            const monthlyMatches = Math.round(hours * 2); // Estimate matches from hours
            const maxHours = Math.max(...Object.values(monthlyHours));
            return {
              month,
              hours: Math.round(hours),
              matches: monthlyMatches,
              intensity: hours / maxHours // Normalized intensity for color
            };
          })
        }
      }
    };
    
  } catch (error) {
    console.error('Error in computeYearInMotion:', error);
    
    // Fallback to mock data if real data fails
    return {
      sceneId: "year_in_motion",
      vizKind: "heatmap",
      insight: {
        summary: "Unable to load match data. Using sample data for demonstration.",
        details: [
          "Could not fetch your match history",
          "This might be due to API limitations or no recent matches",
          "Sample data shown for demonstration purposes"
        ],
        action: "Play some games and try again later",
        metrics: [
          { label: "Total Matches", value: 0, unit: "" },
          { label: "Time Invested", value: 0, unit: " hours" },
          { label: "Peak Month", value: "N/A" },
          { label: "Best KDA", value: "N/A" }
        ],
        vizData: {
          type: "year_stats",
          totalMatches: 0,
          totalHours: 0,
          peakMonth: "N/A",
          peakHours: 0,
          monthlyHours: {},
          bestKDA: { value: 0, kills: 0, deaths: 0, assists: 0, date: "N/A" }
        }
      }
    };
  }
}