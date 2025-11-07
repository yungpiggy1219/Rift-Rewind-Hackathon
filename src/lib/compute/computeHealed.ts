import { ScenePayload } from '../types';
import { fetchMatchDetail } from '../riot';

export async function computeHealed(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeHealed] Starting for ${ctx.puuid} - ANALYZING HEALING STATISTICS`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeHealed] Using ${matchIds.length} cached match IDs`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Initialize tracking variables
    let totalHeal = 0;
    let totalHealsOnTeammates = 0;
    let processedMatches = 0;
    
    // Track the match with highest healing
    let maxHealMatch = {
      healing: 0,
      matchId: '',
      championName: '',
      championId: 0,
      date: '',
      kills: 0,
      deaths: 0,
      assists: 0,
      win: false,
      healsOnTeammates: 0
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
        
        // Extract healing stats
        const heal = playerParticipant.totalHeal || 0;
        const healsOnTeammates = playerParticipant.totalHealsOnTeammates || 0;
        
        // Accumulate totals
        totalHeal += heal;
        totalHealsOnTeammates += healsOnTeammates;
        
        // Check if this is the highest healing game
        if (heal > maxHealMatch.healing) {
          maxHealMatch = {
            healing: heal,
            matchId: match.gameId,
            championName: playerParticipant.championName,
            championId: playerParticipant.championId,
            date: matchDate,
            kills: playerParticipant.kills,
            deaths: playerParticipant.deaths,
            assists: playerParticipant.assists,
            win: playerParticipant.win,
            healsOnTeammates
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
    const avgHeal = Math.round(totalHeal / processedMatches);
    const avgHealsOnTeammates = Math.round(totalHealsOnTeammates / processedMatches);
    
    // Calculate healing metrics
    const teammateHealPercent = totalHeal > 0 
      ? (totalHealsOnTeammates / totalHeal) * 100 
      : 0;
    
    const isSupport = teammateHealPercent > 30;
    const healingRole = isSupport 
      ? "Team Healer" 
      : teammateHealPercent > 10 
        ? "Hybrid Healer" 
        : "Self-Sustain";
    
    console.log(`[computeHealed] Processed ${processedMatches} matches`);
    console.log(`[computeHealed] Total healing: ${totalHeal.toLocaleString()}`);
    console.log(`[computeHealed] Highest healing game: ${maxHealMatch.healing.toLocaleString()} with ${maxHealMatch.championName}`);
    
    return {
      sceneId: "total_healed",
      vizKind: "bar",
      insight: {
        summary: `${totalHeal.toLocaleString()} total healing across ${processedMatches} games. Your best healing performance was ${maxHealMatch.healing.toLocaleString()} with ${maxHealMatch.championName}.`,
        details: [
          `Total healing done: ${totalHeal.toLocaleString()} (avg: ${avgHeal.toLocaleString()}/game)`,
          `Healing on teammates: ${totalHealsOnTeammates.toLocaleString()} (${teammateHealPercent.toFixed(1)}% of total healing)`,
          `Healing role: ${healingRole}`,
          `Highest healing game: ${maxHealMatch.healing.toLocaleString()} with ${maxHealMatch.championName}`,
          `That match: ${maxHealMatch.win ? 'Victory' : 'Defeat'} - KDA ${maxHealMatch.kills}/${maxHealMatch.deaths}/${maxHealMatch.assists} on ${maxHealMatch.date}`,
          maxHealMatch.healsOnTeammates > 0 
            ? `${maxHealMatch.healsOnTeammates.toLocaleString()} healing went to teammates in your peak game` 
            : "All healing was self-sustain in your peak game"
        ],
        action: isSupport 
          ? "Excellent team support! Your healing is keeping your team in fights."
          : teammateHealPercent > 0 
            ? "You're contributing healing to your team. Consider champions with more support capabilities if you enjoy this role."
            : "You rely on self-healing. Consider champions with team healing if you want to support more.",
        metrics: [
          {
            label: "Total Healing",
            value: Math.round(totalHeal / 1000),
            unit: "K",
            context: `${avgHeal.toLocaleString()} avg/game`
          },
          {
            label: "Teammate Healing",
            value: Math.round(totalHealsOnTeammates / 1000),
            unit: "K",
            context: `${teammateHealPercent.toFixed(1)}% of total`
          },
          {
            label: "Healing Role",
            value: healingRole,
            unit: ""
          },
          {
            label: "Peak Healing Game",
            value: Math.round(maxHealMatch.healing / 1000),
            unit: "K",
            context: `with ${maxHealMatch.championName}`
          }
        ],
        vizData: {
          type: "healing_statistics",
          totalHeal,
          totalHealsOnTeammates,
          averages: {
            avgHeal,
            avgHealsOnTeammates
          },
          teammateHealPercent,
          healingRole,
          maxHealMatch: {
            healing: maxHealMatch.healing,
            matchId: maxHealMatch.matchId,
            championName: maxHealMatch.championName,
            championId: maxHealMatch.championId,
            date: maxHealMatch.date,
            kda: `${maxHealMatch.kills}/${maxHealMatch.deaths}/${maxHealMatch.assists}`,
            result: maxHealMatch.win ? 'Victory' : 'Defeat',
            healsOnTeammates: maxHealMatch.healsOnTeammates
          },
          // Stats for display
          stats: {
            totalHealing: totalHeal,
            avgHealing: avgHeal,
            teammateHealing: totalHealsOnTeammates,
            highestHealing: maxHealMatch.healing,
            healingRole: healingRole
          },
          // Bar chart data comparing healing types
          categories: ["Self Healing", "Teammate Healing"],
          values: [
            totalHeal - totalHealsOnTeammates,
            totalHealsOnTeammates
          ],
          colors: ["#10B981", "#3B82F6"]
        }
      }
    };
    
  } catch (error) {
    console.error('Error in computeHealed:', error);
    
    // Fallback to mock data if real data fails
    return {
      sceneId: "total_healed",
      vizKind: "bar",
      insight: {
        summary: "Unable to load healing statistics. Using sample data for demonstration.",
        details: [
          "Could not fetch your healing statistics",
          "This might be due to API limitations or no recent matches",
          "Sample data shown for demonstration purposes"
        ],
        action: "Play some games and try again later",
        metrics: [
          { label: "Total Healing", value: 0, unit: "K" },
          { label: "Teammate Healing", value: 0, unit: "K" },
          { label: "Healing Role", value: "N/A" },
          { label: "Peak Healing Game", value: 0, unit: "K" }
        ],
        vizData: {
          type: "healing_statistics",
          stats: {
            totalHealing: 0,
            avgHealing: 0,
            teammateHealing: 0,
            highestHealing: 0,
            healingRole: 'N/A'
          },
          categories: [],
          values: [],
          colors: []
        }
      }
    };
  }
}
