import { ScenePayload, MatchParticipant } from '../types';
import { fetchMatchDetailFromCache } from '../riot';

// Type guard to check if participant is a MatchParticipant
function isMatchParticipant(participant: MatchParticipant | { puuid: string; riotIdGameName: string }): participant is MatchParticipant {
  return 'goldEarned' in participant && 'win' in participant;
}

export async function computeVisionScore(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeVisionScore] Starting for ${ctx.puuid} - ANALYZING VISION STATISTICS`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeVisionScore] Using ${matchIds.length} cached match IDs`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Track vision statistics
    let totalVisionScore = 0;
    let totalWardsPlaced = 0;
    let totalWardsKilled = 0;
    let totalVisionWardsBought = 0;
    let totalVisionScorePerMinute = 0;
    let processedMatches = 0;
    
    // Track the best vision game
    let bestVisionGame = {
      visionScore: 0,
      matchId: '',
      date: '',
      championName: '',
      wardsPlaced: 0,
      wardsKilled: 0,
      visionWardsBought: 0,
      visionScorePerMinute: 0
    };
    
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
        
        // Extract vision statistics
        const visionScore = playerParticipant.visionScore || 0;
        const wardsPlaced = playerParticipant.wardsPlaced || 0;
        const wardsKilled = playerParticipant.wardsKilled || 0;
        const visionWardsBought = playerParticipant.visionWardsBoughtInGame || 0;
        const gameDuration = match.gameDuration || 1;
        const visionScorePerMinute = (visionScore / gameDuration) * 60;
        
        // Update totals
        totalVisionScore += visionScore;
        totalWardsPlaced += wardsPlaced;
        totalWardsKilled += wardsKilled;
        totalVisionWardsBought += visionWardsBought;
        totalVisionScorePerMinute += visionScorePerMinute;
        
        // Check if this is the best vision game
        if (visionScore > bestVisionGame.visionScore) {
          const matchDate = new Date(match.gameCreation || Date.now()).toLocaleDateString();
          bestVisionGame = {
            visionScore,
            matchId: match.gameId,
            date: matchDate,
            championName: playerParticipant.championName,
            wardsPlaced,
            wardsKilled,
            visionWardsBought,
            visionScorePerMinute: Math.round(visionScorePerMinute * 10) / 10
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
    const avgVisionScore = Math.round(totalVisionScore / processedMatches);
    const avgWardsPlaced = Math.round(totalWardsPlaced / processedMatches);
    const avgWardsKilled = Math.round(totalWardsKilled / processedMatches);
    const avgVisionWardsBought = Math.round((totalVisionWardsBought / processedMatches) * 10) / 10;
    const avgVisionScorePerMinute = Math.round((totalVisionScorePerMinute / processedMatches) * 10) / 10;
    
    console.log(`[computeVisionScore] Processed ${processedMatches} matches`);
    console.log(`[computeVisionScore] Average vision score: ${avgVisionScore}`);
    console.log(`[computeVisionScore] Total wards placed: ${totalWardsPlaced}`);
    console.log(`[computeVisionScore] Best vision game: ${bestVisionGame.visionScore} on ${bestVisionGame.championName}`);
    
    // Determine vision rating
    let visionRating: string;
    
    if (avgVisionScore >= 60) {
      visionRating = "Vision Master";
    } else if (avgVisionScore >= 40) {
      visionRating = "Vision Expert";
    } else if (avgVisionScore >= 25) {
      visionRating = "Vision Aware";
    } else {
      visionRating = "Vision Learning";
    }
    
    // Prepare bar chart data
    const categories = [
      "Total Vision Score",
      "Wards Placed",
      "Wards Killed",
      "Control Wards Bought"
    ];
    
    const values = [
      totalVisionScore,
      totalWardsPlaced,
      totalWardsKilled,
      totalVisionWardsBought
    ];
    
    // Color coding: green for good stats, blue for neutral
    const colors = [
      "#10B981", // Green for vision score
      "#3B82F6", // Blue for wards placed
      "#F59E0B", // Orange for wards killed
      "#8B5CF6"  // Purple for control wards
    ];
    
    return {
      sceneId: "vision_score",
      vizKind: "bar",
      insight: {
        summary: `${visionRating}: ${avgVisionScore} average vision score with ${totalWardsPlaced.toLocaleString()} total wards placed across ${processedMatches} games.`,
        details: [
          `Average vision score: ${avgVisionScore} per game (${avgVisionScorePerMinute} per minute)`,
          `Total wards placed: ${totalWardsPlaced.toLocaleString()} (avg: ${avgWardsPlaced}/game)`,
          `Total wards cleared: ${totalWardsKilled.toLocaleString()} (avg: ${avgWardsKilled}/game)`,
          `Total control wards bought: ${totalVisionWardsBought.toLocaleString()} (avg: ${avgVisionWardsBought}/game)`,
          `Best vision game: ${bestVisionGame.visionScore} score on ${bestVisionGame.championName} (${bestVisionGame.date})`
        ],
        action: avgVisionScore < 40 
          ? "Focus on buying more control wards and placing wards in key locations"
          : "Great vision control! Keep denying enemy vision and maintaining map awareness",
        metrics: [
          {
            label: "Avg Vision Score",
            value: avgVisionScore,
            unit: "",
            context: `${avgVisionScorePerMinute}/min`
          },
          {
            label: "Avg Wards Placed",
            value: avgWardsPlaced,
            unit: "",
            context: `${totalWardsPlaced} total`
          },
          {
            label: "Avg Wards Killed",
            value: avgWardsKilled,
            unit: "",
            context: `${totalWardsKilled} total`
          },
          {
            label: "Best Vision Game",
            value: bestVisionGame.visionScore,
            unit: "",
            context: bestVisionGame.championName
          }
        ],
        vizData: {
          type: "vision_statistics",
          categories,
          values,
          colors,
          bestVisionGame: {
            visionScore: bestVisionGame.visionScore,
            championName: bestVisionGame.championName,
            date: bestVisionGame.date,
            wardsPlaced: bestVisionGame.wardsPlaced,
            wardsKilled: bestVisionGame.wardsKilled,
            visionWardsBought: bestVisionGame.visionWardsBought,
            visionScorePerMinute: bestVisionGame.visionScorePerMinute
          },
          totals: {
            totalVisionScore,
            totalWardsPlaced,
            totalWardsKilled,
            totalVisionWardsBought
          },
          averages: {
            avgVisionScore,
            avgWardsPlaced,
            avgWardsKilled,
            avgVisionWardsBought,
            avgVisionScorePerMinute
          }
        }
      }
    };
    
  } catch (error) {
    console.error('Error in computeVisionScore:', error);
    
    // Fallback to mock data if real data fails
    return {
      sceneId: "vision_score",
      vizKind: "bar",
      insight: {
        summary: "Unable to load vision statistics. Using sample data for demonstration.",
        details: [
          "Could not fetch your detailed match statistics",
          "This might be due to API limitations or no recent matches",
          "Sample data shown for demonstration purposes"
        ],
        action: "Play some games and try again later",
        metrics: [
          { label: "Avg Vision Score", value: 0, unit: "" },
          { label: "Avg Wards Placed", value: 0, unit: "" },
          { label: "Avg Wards Killed", value: 0, unit: "" },
          { label: "Best Vision Game", value: 0, unit: "" }
        ],
        vizData: {
          type: "vision_statistics",
          categories: [],
          values: [],
          colors: []
        }
      }
    };
  }
}
