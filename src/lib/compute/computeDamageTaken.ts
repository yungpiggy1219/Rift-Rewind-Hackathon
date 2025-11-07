import { ScenePayload } from '../types';
import { fetchMatchDetail } from '../riot';

export async function computeDamageTaken(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeDamageTaken] Starting for ${ctx.puuid} - ANALYZING DAMAGE TAKEN STATISTICS`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeDamageTaken] Using ${matchIds.length} cached match IDs`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Initialize tracking variables
    let totalDamageTaken = 0;
    let processedMatches = 0;
    
    // Track the match with highest damage taken
    let maxDamageTakenMatch = {
      damageTaken: 0,
      matchId: '',
      championName: '',
      championId: 0,
      date: '',
      kills: 0,
      deaths: 0,
      assists: 0,
      win: false,
      items: [] as number[],
      summoner1Id: 0,
      summoner2Id: 0
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
        
        // Extract damage taken
        const damageTaken = playerParticipant.totalDamageTaken || 0;
        
        // Accumulate totals
        totalDamageTaken += damageTaken;
        
        // Check if this is the highest damage taken game
        if (damageTaken > maxDamageTakenMatch.damageTaken) {
          maxDamageTakenMatch = {
            damageTaken,
            matchId: match.gameId,
            championName: playerParticipant.championName,
            championId: playerParticipant.championId,
            date: matchDate,
            kills: playerParticipant.kills,
            deaths: playerParticipant.deaths,
            assists: playerParticipant.assists,
            win: playerParticipant.win,
            items: playerParticipant.items || [],
            summoner1Id: playerParticipant.summoner1Id || 0,
            summoner2Id: playerParticipant.summoner2Id || 0
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
    
    // Calculate average
    const avgDamageTaken = Math.round(totalDamageTaken / processedMatches);
    
    // Determine tank effectiveness
    const isTanky = avgDamageTaken > 25000;
    const tankLevel = isTanky ? "High" : avgDamageTaken > 20000 ? "Medium" : "Low";
    
    console.log(`[computeDamageTaken] Processed ${processedMatches} matches`);
    console.log(`[computeDamageTaken] Total damage taken: ${totalDamageTaken.toLocaleString()}`);
    console.log(`[computeDamageTaken] Highest damage taken: ${maxDamageTakenMatch.damageTaken.toLocaleString()} with ${maxDamageTakenMatch.championName}`);
    
    return {
      sceneId: "damage_taken",
      vizKind: "bar",
      insight: {
        summary: `${totalDamageTaken.toLocaleString()} total damage absorbed across ${processedMatches} games. Your toughest battle was ${maxDamageTakenMatch.damageTaken.toLocaleString()} damage taken with ${maxDamageTakenMatch.championName}.`,
        details: [
          `Total damage taken: ${totalDamageTaken.toLocaleString()} (avg: ${avgDamageTaken.toLocaleString()}/game)`,
          `Tank level: ${tankLevel} - You ${isTanky ? 'excel at' : 'could improve'} frontline presence`,
          `Highest damage taken: ${maxDamageTakenMatch.damageTaken.toLocaleString()} with ${maxDamageTakenMatch.championName}`,
          `That match: ${maxDamageTakenMatch.win ? 'Victory' : 'Defeat'} - KDA ${maxDamageTakenMatch.kills}/${maxDamageTakenMatch.deaths}/${maxDamageTakenMatch.assists} on ${maxDamageTakenMatch.date}`,
          maxDamageTakenMatch.deaths > 10 
            ? "High deaths in your peak tanking game - consider building more defensive items" 
            : "Great survival while tanking damage!"
        ],
        action: isTanky 
          ? "Excellent tanking! Your frontline presence is a key asset to your team."
          : "If you're playing tanks or bruisers, work on positioning to absorb more damage for your team.",
        metrics: [
          {
            label: "Total Damage Taken",
            value: Math.round(totalDamageTaken / 1000),
            unit: "K",
            context: `${avgDamageTaken.toLocaleString()} avg/game`
          },
          {
            label: "Tank Level",
            value: tankLevel,
            unit: "",
            context: `${avgDamageTaken.toLocaleString()} avg damage/game`
          },
          {
            label: "Peak Tanking Game",
            value: Math.round(maxDamageTakenMatch.damageTaken / 1000),
            unit: "K",
            context: `with ${maxDamageTakenMatch.championName}`
          },
          {
            label: "Games Analyzed",
            value: processedMatches,
            unit: ""
          }
        ],
        vizData: {
          type: "damage_taken_statistics",
          totalDamageTaken,
          avgDamageTaken,
          tankLevel,
          maxDamageTakenMatch: {
            damageTaken: maxDamageTakenMatch.damageTaken,
            matchId: maxDamageTakenMatch.matchId,
            championName: maxDamageTakenMatch.championName,
            championId: maxDamageTakenMatch.championId,
            date: maxDamageTakenMatch.date,
            kda: `${maxDamageTakenMatch.kills}/${maxDamageTakenMatch.deaths}/${maxDamageTakenMatch.assists}`,
            result: maxDamageTakenMatch.win ? 'Victory' : 'Defeat',
            items: maxDamageTakenMatch.items,
            summoner1Id: maxDamageTakenMatch.summoner1Id,
            summoner2Id: maxDamageTakenMatch.summoner2Id
          },
          // Stats for display
          stats: {
            totalDamageTaken: totalDamageTaken,
            avgDamageTaken: avgDamageTaken,
            highestDamageTaken: maxDamageTakenMatch.damageTaken,
            tankLevel: tankLevel
          },
          // Bar chart data comparing to benchmarks
          categories: ["Your Average", "Tank Benchmark", "Fighter Benchmark", "Assassin Benchmark"],
          values: [
            avgDamageTaken,
            30000, // Tank benchmark
            22000, // Fighter benchmark
            15000  // Assassin benchmark
          ],
          colors: ["#EF4444", "#10B981", "#F59E0B", "#8B5CF6"]
        }
      }
    };
    
  } catch (error) {
    console.error('Error in computeDamageTaken:', error);
    
    // Fallback to mock data if real data fails
    return {
      sceneId: "damage_taken",
      vizKind: "bar",
      insight: {
        summary: "Unable to load damage taken statistics. Using sample data for demonstration.",
        details: [
          "Could not fetch your damage taken statistics",
          "This might be due to API limitations or no recent matches",
          "Sample data shown for demonstration purposes"
        ],
        action: "Play some games and try again later",
        metrics: [
          { label: "Total Damage Taken", value: 0, unit: "K" },
          { label: "Tank Level", value: "N/A" },
          { label: "Peak Tanking Game", value: 0, unit: "K" },
          { label: "Games Analyzed", value: 0, unit: "" }
        ],
        vizData: {
          type: "damage_taken_statistics",
          maxDamageTakenMatch: {
            damageTaken: 0,
            matchId: '',
            championName: 'Unknown',
            championId: 0,
            date: '',
            kda: '0/0/0',
            result: 'Unknown',
            items: [],
            summoner1Id: 0,
            summoner2Id: 0
          },
          stats: {
            totalDamageTaken: 0,
            avgDamageTaken: 0,
            highestDamageTaken: 0,
            tankLevel: 'N/A'
          },
          categories: [],
          values: [],
          colors: []
        }
      }
    };
  }
}
