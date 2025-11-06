import { ScenePayload } from '../types';
import { fetchMatchDetail } from '../riot';

export async function computeDamageShare(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeDamageShare] Starting for ${ctx.puuid} - ANALYZING DAMAGE STATISTICS`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeDamageShare] Using ${matchIds.length} cached match IDs`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Initialize tracking variables
    let totalDamageDealt = 0;
    let totalDamageDealtToChampions = 0;
    let processedMatches = 0;
    
    // Track the match with highest damage to champions
    let maxDamageMatch = {
      damage: 0,
      matchId: '',
      championName: '',
      championId: 0,
      date: '',
      kills: 0,
      deaths: 0,
      assists: 0
    };
    
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
        const matchDate = new Date(match.gameCreation || Date.now()).toLocaleDateString();
        
        // Extract damage stats
        const damageDealt = playerParticipant.totalDamageDealt || 0;
        const damageToChampions = playerParticipant.totalDamageDealtToChampions || 0;
        
        // Accumulate totals
        totalDamageDealt += damageDealt;
        totalDamageDealtToChampions += damageToChampions;
        
        // Check if this is the highest damage game
        if (damageToChampions > maxDamageMatch.damage) {
          maxDamageMatch = {
            damage: damageToChampions,
            matchId: match.gameId,
            championName: playerParticipant.championName,
            championId: playerParticipant.championId,
            date: matchDate,
            kills: playerParticipant.kills,
            deaths: playerParticipant.deaths,
            assists: playerParticipant.assists
          };
        }
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
    const avgDamageDealt = Math.round(totalDamageDealt / processedMatches);
    const avgDamageToChampions = Math.round(totalDamageDealtToChampions / processedMatches);
    
    // Calculate percentage of damage dealt that went to champions
    const championDamagePercent = totalDamageDealt > 0 
      ? (totalDamageDealtToChampions / totalDamageDealt) * 100 
      : 0;
    
    console.log(`[computeDamageShare] Processed ${processedMatches} matches`);
    console.log(`[computeDamageShare] Total damage to champions: ${totalDamageDealtToChampions.toLocaleString()}`);
    console.log(`[computeDamageShare] Highest damage game: ${maxDamageMatch.damage.toLocaleString()} with ${maxDamageMatch.championName}`);
    
    return {
      sceneId: "damage_share",
      vizKind: "bar",
      insight: {
        summary: `${totalDamageDealtToChampions.toLocaleString()} total damage to champions across ${processedMatches} games. Your peak was ${maxDamageMatch.damage.toLocaleString()} damage with ${maxDamageMatch.championName}.`,
        details: [
          `Total damage dealt: ${totalDamageDealt.toLocaleString()} (avg: ${avgDamageDealt.toLocaleString()}/game)`,
          `Total damage to champions: ${totalDamageDealtToChampions.toLocaleString()} (avg: ${avgDamageToChampions.toLocaleString()}/game)`,
          `${championDamagePercent.toFixed(1)}% of your damage went to champions`,
          `Highest damage game: ${maxDamageMatch.damage.toLocaleString()} with ${maxDamageMatch.championName}`,
          `That match had a KDA of ${maxDamageMatch.kills}/${maxDamageMatch.deaths}/${maxDamageMatch.assists} on ${maxDamageMatch.date}`
        ],
        action: championDamagePercent >= 60 
          ? "Excellent focus on champion damage! Keep pressuring your opponents."
          : "Try to focus more damage on enemy champions rather than minions and objectives.",
        metrics: [
          {
            label: "Total Damage to Champions",
            value: Math.round(totalDamageDealtToChampions / 1000),
            unit: "K",
            context: `${avgDamageToChampions.toLocaleString()} avg/game`
          },
          {
            label: "Champion Damage %",
            value: championDamagePercent.toFixed(1),
            unit: "%",
            context: "of total damage"
          },
          {
            label: "Peak Damage Game",
            value: Math.round(maxDamageMatch.damage / 1000),
            unit: "K",
            context: `with ${maxDamageMatch.championName}`
          },
          {
            label: "Games Analyzed",
            value: processedMatches,
            unit: ""
          }
        ],
        vizData: {
          type: "damage_statistics",
          totalDamageDealt,
          totalDamageDealtToChampions,
          avgDamageDealt,
          avgDamageToChampions,
          championDamagePercent,
          maxDamageMatch: {
            damage: maxDamageMatch.damage,
            matchId: maxDamageMatch.matchId,
            championName: maxDamageMatch.championName,
            championId: maxDamageMatch.championId,
            date: maxDamageMatch.date,
            kda: `${maxDamageMatch.kills}/${maxDamageMatch.deaths}/${maxDamageMatch.assists}`
          },
          // Bar chart data comparing damage dealt metrics
          categories: ["Your Average", "DPS Benchmark", "Carry Benchmark", "Support Benchmark"],
          values: [
            avgDamageToChampions,
            25000, // DPS benchmark
            30000, // Carry benchmark  
            15000  // Support benchmark
          ],
          colors: ["#EF4444", "#10B981", "#F59E0B", "#8B5CF6"]
        }
      }
    };
    
  } catch (error) {
    console.error('Error in computeDamageShare:', error);
    
    // Fallback to mock data if real data fails
    return {
      sceneId: "damage_share",
      vizKind: "bar",
      insight: {
        summary: "Unable to load damage statistics. Using sample data for demonstration.",
        details: [
          "Could not fetch your damage statistics",
          "This might be due to API limitations or no recent matches",
          "Sample data shown for demonstration purposes"
        ],
        action: "Play some games and try again later",
        metrics: [
          { label: "Total Damage to Champions", value: 0, unit: "K" },
          { label: "Champion Damage %", value: "N/A" },
          { label: "Peak Damage Game", value: 0, unit: "K" },
          { label: "Games Analyzed", value: 0, unit: "" }
        ],
        vizData: {
          type: "damage_statistics",
          totalDamageDealt: 0,
          totalDamageDealtToChampions: 0,
          avgDamageDealt: 0,
          avgDamageToChampions: 0,
          championDamagePercent: 0,
          categories: [],
          values: [],
          colors: []
        }
      }
    };
  }
}
