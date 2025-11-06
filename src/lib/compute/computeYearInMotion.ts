import { ScenePayload, MatchParticipant, MatchData } from '../types';
import * as cache from '../cache';

// Type guard to check if participant has full match data
function isFullParticipant(participant: unknown): participant is MatchParticipant {
  const p = participant as Partial<MatchParticipant>;
  return !!participant && typeof participant === 'object' && typeof p.kills === 'number' && typeof p.deaths === 'number' && typeof p.assists === 'number';
}

export async function computeYearInMotion(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeYearInMotion] Starting for ${ctx.puuid} - CALCULATING REAL STATS`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeYearInMotion] Processing ${matchIds.length} match IDs from cache`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Step 2: Fetch match details from cache for analysis
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyHours: Record<string, number> = {};
    let totalMatches = 0;
    let totalSeconds = 0;
    let bestKDA = { kda: 0, kills: 0, deaths: 0, assists: 0, matchId: '', date: '' };
    let cacheHits = 0;
    let cacheMisses = 0;
    
    // Process matches in batches
    const batchSize = 20; // Increased since we're reading from cache
    console.log(`[computeYearInMotion] Processing in batches of ${batchSize}...`);
    
    for (let i = 0; i < matchIds.length; i += batchSize) {
      const batch = matchIds.slice(i, i + batchSize);
      console.log(`[computeYearInMotion] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(matchIds.length / batchSize)} (${batch.length} matches)`);
      
      const matchPromises = batch.map(async (matchId) => {
        try {
          // Read match detail directly from cache file
          const cacheKey = `match-detail-${matchId}`;
          const cached = await cache.get(cacheKey);
          
          if (cached) {
            cacheHits++;
            return { matchId, data: cached as MatchData };
          } else {
            cacheMisses++;
            console.warn(`[computeYearInMotion] No cached data for match ${matchId}`);
            return null;
          }
        } catch (error) {
          cacheMisses++;
          console.warn(`[computeYearInMotion] Failed to fetch match ${matchId}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(matchPromises);
      
      for (const result of results) {
        if (!result) continue;
        
        const match = result.data;
        
        // Find player's participant data
        const playerParticipant = match.participants.find(p => p.puuid === ctx.puuid);
        if (!playerParticipant) {
          console.warn(`[computeYearInMotion] Player ${ctx.puuid} not found in match ${match.gameId}`);
          continue;
        }
        
        // Check if this is full participant data (not just name)
        if (!isFullParticipant(playerParticipant)) {
          console.warn(`[computeYearInMotion] Match ${match.gameId} has incomplete participant data`);
          continue;
        }
        
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
            kills: kills || 0,
            deaths: deaths || 0,
            assists: assists || 0,
            matchId: match.gameId,
            date: matchDate.toLocaleDateString()
          };
        }
      }
      
      // Log progress
      console.log(`[computeYearInMotion] Progress: ${totalMatches} matches processed so far (${cacheHits} hits, ${cacheMisses} misses)`);
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
    
    console.log(`[computeYearInMotion] ✅ Completed analysis:`);
    console.log(`  - Processed ${totalMatches} matches`);
    console.log(`  - Total time: ${totalHours.toFixed(1)} hours`);
    console.log(`  - Cache efficiency: ${cacheHits} hits / ${cacheMisses} misses`);
    console.log(`  - Best KDA: ${bestKDA.kda.toFixed(2)} (${bestKDA.kills}/${bestKDA.deaths}/${bestKDA.assists})`);
    console.log(`  - Peak month: ${peakMonth} (${peakHours.toFixed(1)} hours)`);
    
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
          // Format data for heatmap visualization - always show all 12 months
          months: monthNames.map(month => {
            const hours = monthlyHours[month];
            const hasData = hours !== undefined;
            const maxHours = Math.max(...Object.values(monthlyHours), 1); // Avoid division by zero
            
            return {
              month,
              hours: hasData ? Math.round(hours) : null, // null if no data for this month
              matches: hasData ? Math.round(hours * 2) : null, // Estimate matches from hours, null if no data
              intensity: hasData ? hours / maxHours : 0 // 0 intensity if no data
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