import { ScenePayload, MatchData } from '../types';
import { fetchMatchDetail } from '../riot';
import * as cache from '../cache';

export async function computeYearInMotion(ctx: { puuid: string }): Promise<ScenePayload> {
  try {
    console.log(`[computeYearInMotion] Starting for ${ctx.puuid}`);
    
    // Step 1: Fetch match IDs once from the cached endpoint
    const matchIdsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/match-ids?puuid=${ctx.puuid}`);
    
    if (!matchIdsResponse.ok) {
      throw new Error('Failed to fetch match IDs');
    }
    
    const matchIdsData = await matchIdsResponse.json();
    const allMatchIds: string[] = matchIdsData.matchIds || matchIdsData.matches || [];
    
    console.log(`[computeYearInMotion] Got ${allMatchIds.length} match IDs`);
    
    if (allMatchIds.length === 0) {
      throw new Error('No matches found for this season');
    }
    
    // Step 2: Process each match and fetch details (with caching)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyHours: Record<string, number> = {};
    let totalMatches = 0;
    let totalHours = 0;
    
    for (const matchId of allMatchIds) {
      try {
        // Check cache first
        const cacheKey = `match-detail-${matchId}`;
        let match = await cache.get<MatchData>(cacheKey);
        
        // If not cached, fetch from API
        if (!match) {
          console.log(`[computeYearInMotion] Fetching details for match ${matchId}`);
          match = await fetchMatchDetail(matchId);
          
          if (match) {
            // Cache the match details
            await cache.set(cacheKey, match);
          }
        }
        
        if (!match) {
          console.warn(`[computeYearInMotion] Failed to fetch match ${matchId}`);
          continue;
        }
        
        // Calculate hours for this match
        const hours = (match.gameDuration || 0) / 3600; // Convert seconds to hours
        
        // Determine the month
        const matchDate = new Date(match.gameCreation || Date.now());
        const monthKey = monthNames[matchDate.getMonth()];
        
        // Accumulate data
        if (!monthlyHours[monthKey]) {
          monthlyHours[monthKey] = 0;
        }
        
        monthlyHours[monthKey] += hours;
        totalHours += hours;
        totalMatches += 1;
        
      } catch (error) {
        console.error(`[computeYearInMotion] Error processing match ${matchId}:`, error);
        continue;
      }
    }
    
    console.log(`[computeYearInMotion] Processed ${totalMatches} matches, ${totalHours.toFixed(1)} hours total`);
    console.log(`[computeYearInMotion] Monthly breakdown:`, monthlyHours);
    
    // Step 3: Find the month with most hours
    let peakMonth = 'N/A';
    let peakHours = 0;
    
    for (const [month, hours] of Object.entries(monthlyHours)) {
      if (hours > peakHours) {
        peakHours = hours;
        peakMonth = month;
      }
    }

    return {
      sceneId: "year_in_motion",
      insight: {
        summary: `${totalMatches} matches. ${Math.round(totalHours)} hours of data collected. ${peakMonth} — your peak of activity.`,
        details: [
          `You played ${totalMatches} matches in 2025`,
          `Total time invested: ${Math.round(totalHours)} hours`,
          `Peak activity: ${peakMonth} with ${Math.round(peakHours)} hours played`
        ],
        action: "Your gaming journey shows dedication - keep pushing forward",
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
          }
        ],
        vizData: {
          type: "basic_stats",
          totalMatches,
          totalHours: Math.round(totalHours),
          peakMonth,
          peakHours: Math.round(peakHours)
        }
      }
    };
  } catch (error) {
    console.error('Error in computeYearInMotion:', error);
    return {
      sceneId: "year_in_motion",
      insight: {
        summary: "0 matches. 0 hours of data collected. Unable to determine peak activity. No data available for analysis.",
        details: [
          "Unable to load match data for analysis",
          "This could be due to missing API key or no matches found",
          "Please ensure you have played games in the selected season"
        ],
        action: "Play some games and try again later",
        metrics: [
          { label: "Total Matches", value: 0, unit: "" },
          { label: "Time Invested", value: 0, unit: " hours" },
          { label: "Peak Month", value: "N/A" }
        ],
        vizData: {
          type: "basic_stats",
          totalMatches: 0,
          totalHours: 0,
          peakMonth: "N/A",
          peakHours: 0
        }
      }
    };
  }
}