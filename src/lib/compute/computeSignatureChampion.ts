import { ScenePayload, MatchData } from '../types';
import { fetchMatchDetail } from '../riot';

export async function computeSignatureChampion(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeSignatureChampion] Starting for ${ctx.puuid} - ANALYZING MOST USED CHAMPION`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeSignatureChampion] Using ${matchIds.length} cached match IDs`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Step 2: Analyze champion usage from match data
    const championStats: Record<number, {
      championId: number;
      championName: string;
      games: number;
      wins: number;
      totalKills: number;
      totalDeaths: number;
      totalAssists: number;
      totalGold: number;
    }> = {};
    
    // Process matches in batches to avoid overwhelming the API
    const batchSize = 10;
    let processedMatches = 0;
    
    for (let i = 0; i < Math.min(matchIds.length, 100); i += batchSize) {
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
        
        processedMatches++;
        const { championId, championName, kills, deaths, assists, goldEarned, win } = playerParticipant;
        
        // Initialize champion stats if not exists
        if (!championStats[championId]) {
          championStats[championId] = {
            championId,
            championName,
            games: 0,
            wins: 0,
            totalKills: 0,
            totalDeaths: 0,
            totalAssists: 0,
            totalGold: 0
          };
        }
        
        // Update champion stats
        const stats = championStats[championId];
        stats.games++;
        if (win) stats.wins++;
        stats.totalKills += kills;
        stats.totalDeaths += deaths;
        stats.totalAssists += assists;
        stats.totalGold += goldEarned;
      }
      
      // Small delay between batches
      if (i + batchSize < matchIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Step 3: Find the most played champion
    const championList = Object.values(championStats);
    if (championList.length === 0) {
      throw new Error('No champion data found');
    }
    
    // Sort by games played (most played first)
    championList.sort((a, b) => b.games - a.games);
    const mostPlayedChampion = championList[0];
    
    // Calculate stats for most played champion
    const winRate = (mostPlayedChampion.wins / mostPlayedChampion.games) * 100;
    const avgKDA = mostPlayedChampion.totalDeaths === 0 
      ? mostPlayedChampion.totalKills + mostPlayedChampion.totalAssists
      : (mostPlayedChampion.totalKills + mostPlayedChampion.totalAssists) / mostPlayedChampion.totalDeaths;
    const avgGold = Math.round(mostPlayedChampion.totalGold / mostPlayedChampion.games);
    
    // Calculate additional stats from match data
    let totalDamageDealt = 0;
    let totalVisionScore = 0;
    let totalMinionsKilled = 0;
    let totalGameDuration = 0;
    let gamesWithData = 0;
    
    // Fetch detailed stats for the most played champion
    for (let i = 0; i < Math.min(matchIds.length, 100); i += batchSize) {
      const batch = matchIds.slice(i, i + batchSize);
      
      const matchPromises = batch.map(async (matchId) => {
        try {
          return await fetchMatchDetail(matchId);
        } catch (error) {
          return null;
        }
      });
      
      const matches = await Promise.all(matchPromises);
      
      for (const match of matches) {
        if (!match) continue;
        
        const playerParticipant = match.participants.find(p => p.puuid === ctx.puuid);
        if (!playerParticipant || playerParticipant.championId !== mostPlayedChampion.championId) continue;
        
        gamesWithData++;
        totalDamageDealt += playerParticipant.totalDamageDealtToChampions || 0;
        totalVisionScore += playerParticipant.visionScore || 0;
        totalMinionsKilled += (playerParticipant.totalMinionsKilled || 0) + (playerParticipant.neutralMinionsKilled || 0);
        totalGameDuration += match.gameDuration || 0;
      }
    }
    
    const avgDamagePerMin = gamesWithData > 0 && totalGameDuration > 0 
      ? Math.round((totalDamageDealt / totalGameDuration) * 60)
      : 0;
    const avgVisionScore = gamesWithData > 0 ? Math.round(totalVisionScore / gamesWithData) : 0;
    const avgCSPerMin = gamesWithData > 0 && totalGameDuration > 0
      ? ((totalMinionsKilled / totalGameDuration) * 60).toFixed(1)
      : '0.0';
    
    console.log(`[computeSignatureChampion] Most played: ${mostPlayedChampion.championName} (${mostPlayedChampion.games} games, ${winRate.toFixed(1)}% WR)`);
    console.log(`[computeSignatureChampion] Dmg/Min: ${avgDamagePerMin}, Vision: ${avgVisionScore}, CS/Min: ${avgCSPerMin}`);
    
    // Get top 3 champions for comparison
    const top3Champions = championList.slice(0, 3);
    
    return {
      sceneId: "signature_champion",
      vizKind: "radar",
      insight: {
        summary: `${mostPlayedChampion.championName} is your signature champion. ${mostPlayedChampion.games} games played with ${winRate.toFixed(1)}% win rate.`,
        details: [
          `You've mastered ${mostPlayedChampion.championName} with ${mostPlayedChampion.games} games played`,
          `Win rate: ${winRate.toFixed(1)}% (${mostPlayedChampion.wins} wins out of ${mostPlayedChampion.games} games)`,
          `Average KDA: ${avgKDA.toFixed(2)} (${(mostPlayedChampion.totalKills/mostPlayedChampion.games).toFixed(1)}/${(mostPlayedChampion.totalDeaths/mostPlayedChampion.games).toFixed(1)}/${(mostPlayedChampion.totalAssists/mostPlayedChampion.games).toFixed(1)})`,
          `Average gold per game: ${avgGold.toLocaleString()}`
        ],
        action: winRate >= 60 ? "Keep dominating with your signature pick!" : "Practice more to improve your win rate",
        metrics: [
          {
            label: "Signature Champion",
            value: mostPlayedChampion.championName,
            unit: ""
          },
          {
            label: "Games Played",
            value: mostPlayedChampion.games,
            unit: ""
          },
          {
            label: "Win Rate",
            value: winRate.toFixed(1),
            unit: "%",
            context: `${mostPlayedChampion.wins}W ${mostPlayedChampion.games - mostPlayedChampion.wins}L`
          },
          {
            label: "Average KDA",
            value: avgKDA.toFixed(2),
            unit: "",
            context: `${(mostPlayedChampion.totalKills/mostPlayedChampion.games).toFixed(1)}/${(mostPlayedChampion.totalDeaths/mostPlayedChampion.games).toFixed(1)}/${(mostPlayedChampion.totalAssists/mostPlayedChampion.games).toFixed(1)}`
          }
        ],
        vizData: {
          type: "champion_mastery",
          mostPlayed: {
            championId: mostPlayedChampion.championId,
            championName: mostPlayedChampion.championName,
            games: mostPlayedChampion.games,
            wins: mostPlayedChampion.wins,
            winRate: winRate,
            avgKDA: avgKDA,
            avgDamagePerMin: avgDamagePerMin,
            avgVisionScore: avgVisionScore,
            avgCSPerMin: parseFloat(avgCSPerMin),
            avgGold: avgGold
          },
          // Stats for display
          stats: {
            winRate: winRate.toFixed(1),
            kda: avgKDA.toFixed(2),
            damagePerMin: avgDamagePerMin,
            visionScore: avgVisionScore,
            csPerMin: avgCSPerMin
          },
          // Radar chart data - 5 key stats only
          categories: ["Win Rate", "KDA", "Dmg/Min", "Vision", "CS/Min"],
          values: [
            winRate, // Win rate (0-100%)
            Math.min(avgKDA / 5 * 100, 100), // KDA normalized (5.0 KDA = 100%)
            Math.min(avgDamagePerMin / 1000 * 100, 100), // Dmg/Min normalized (1000 = 100%)
            Math.min(avgVisionScore / 50 * 100, 100), // Vision normalized (50 = 100%)
            Math.min(parseFloat(avgCSPerMin) / 8 * 100, 100) // CS/Min normalized (8 = 100%)
          ],
          maxValue: 100
        }
      }
    };
    
  } catch (error) {
    console.error('Error in computeSignatureChampion:', error);
    
    // Fallback to mock data if real data fails
    return {
      sceneId: "signature_champion",
      vizKind: "radar",
      insight: {
        summary: "Unable to load champion data. Using sample data for demonstration.",
        details: [
          "Could not fetch your champion statistics",
          "This might be due to API limitations or no recent matches",
          "Sample data shown for demonstration purposes"
        ],
        action: "Play some games and try again later",
        metrics: [
          { label: "Signature Champion", value: "N/A" },
          { label: "Games Played", value: 0, unit: "" },
          { label: "Win Rate", value: "N/A" },
          { label: "Average KDA", value: "N/A" }
        ],
        vizData: {
          type: "champion_mastery",
          mostPlayed: null,
          top3Champions: [],
          categories: ["Games Played", "Win Rate", "KDA", "Gold Efficiency", "Consistency", "Impact"],
          values: [0, 0, 0, 0, 0, 0],
          maxValue: 100
        }
      }
    };
  }
}