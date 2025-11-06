import { ScenePayload } from '../types';
import { fetchMatchDetail } from '../riot';

// Valid League of Legends positions
const VALID_POSITIONS = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const;
type Position = typeof VALID_POSITIONS[number];

interface PositionStats {
  position: Position;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  avgKDA: number;
}

export async function computeSignaturePosition(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeSignaturePosition] Starting for ${ctx.puuid} - ANALYZING POSITION PERFORMANCE`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeSignaturePosition] Using ${matchIds.length} cached match IDs`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Initialize tracking for each position
    const positionStats: Record<string, {
      position: string;
      games: number;
      wins: number;
      losses: number;
      totalKills: number;
      totalDeaths: number;
      totalAssists: number;
    }> = {};
    
    VALID_POSITIONS.forEach(pos => {
      positionStats[pos] = {
        position: pos,
        games: 0,
        wins: 0,
        losses: 0,
        totalKills: 0,
        totalDeaths: 0,
        totalAssists: 0
      };
    });
    
    let processedMatches = 0;
    
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
        
        // Get the position (role field contains individualPosition value)
        const position = playerParticipant.role?.toUpperCase() || 'NONE';
        
        // Only track valid positions
        if (VALID_POSITIONS.includes(position as Position)) {
          const stats = positionStats[position];
          stats.games++;
          if (playerParticipant.win) {
            stats.wins++;
          } else {
            stats.losses++;
          }
          stats.totalKills += playerParticipant.kills;
          stats.totalDeaths += playerParticipant.deaths;
          stats.totalAssists += playerParticipant.assists;
        } else {
          console.log(`[computeSignaturePosition] Unknown position: ${position}`);
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
    
    // Calculate stats for each position
    const positionStatsList: PositionStats[] = VALID_POSITIONS
      .map(pos => {
        const stats = positionStats[pos];
        const winRate = stats.games > 0 ? (stats.wins / stats.games) * 100 : 0;
        const avgKDA = stats.games > 0 && stats.totalDeaths > 0
          ? (stats.totalKills + stats.totalAssists) / stats.totalDeaths
          : stats.totalKills + stats.totalAssists;
        
        return {
          position: pos,
          games: stats.games,
          wins: stats.wins,
          losses: stats.losses,
          winRate,
          totalKills: stats.totalKills,
          totalDeaths: stats.totalDeaths,
          totalAssists: stats.totalAssists,
          avgKDA
        };
      })
      .filter(stat => stat.games > 0) // Only include positions that were played
      .sort((a, b) => b.games - a.games); // Sort by games played
    
    if (positionStatsList.length === 0) {
      throw new Error('No position data found');
    }
    
    // Find the position with highest win rate (minimum 3 games to be considered)
    const eligiblePositions = positionStatsList.filter(stat => stat.games >= 3);
    const bestWinRatePosition = eligiblePositions.length > 0
      ? eligiblePositions.reduce((best, current) => 
          current.winRate > best.winRate ? current : best
        )
      : positionStatsList[0];
    
    // Find most played position
    const mostPlayedPosition = positionStatsList[0];
    
    // Position name mapping for better display
    const positionNames: Record<Position, string> = {
      'TOP': 'Top Lane',
      'JUNGLE': 'Jungle',
      'MIDDLE': 'Mid Lane',
      'BOTTOM': 'Bot Lane (ADC)',
      'UTILITY': 'Support'
    };
    
    console.log(`[computeSignaturePosition] Processed ${processedMatches} matches`);
    console.log(`[computeSignaturePosition] Most played: ${mostPlayedPosition.position} (${mostPlayedPosition.games} games)`);
    console.log(`[computeSignaturePosition] Best win rate: ${bestWinRatePosition.position} (${bestWinRatePosition.winRate.toFixed(1)}%)`);
    
    // Determine if player is a "flex" player or specialist
    const playedPositions = positionStatsList.length;
    const isFlexPlayer = playedPositions >= 3;
    const isSpecialist = mostPlayedPosition.games / processedMatches >= 0.7;
    
    return {
      sceneId: "signature_position",
      vizKind: "bar",
      insight: {
        summary: `${positionNames[bestWinRatePosition.position]} is your strongest position with ${bestWinRatePosition.winRate.toFixed(1)}% win rate across ${bestWinRatePosition.games} games.`,
        details: [
          `Most played position: ${positionNames[mostPlayedPosition.position]} (${mostPlayedPosition.games} games, ${mostPlayedPosition.winRate.toFixed(1)}% WR)`,
          `Best win rate: ${positionNames[bestWinRatePosition.position]} (${bestWinRatePosition.wins}W-${bestWinRatePosition.losses}L, ${bestWinRatePosition.winRate.toFixed(1)}% WR)`,
          `Positions played: ${playedPositions} different roles`,
          isSpecialist 
            ? `You're a ${positionNames[mostPlayedPosition.position]} specialist!`
            : isFlexPlayer
              ? "You're a flexible player who adapts to team needs"
              : "You have a preferred position but can flex when needed",
          `Average KDA on best position: ${bestWinRatePosition.avgKDA.toFixed(2)}`
        ],
        action: bestWinRatePosition.position === mostPlayedPosition.position
          ? `Keep dominating ${positionNames[bestWinRatePosition.position]}! It's both your most played and best performing role.`
          : `Consider playing more ${positionNames[bestWinRatePosition.position]} - it's your highest win rate position!`,
        metrics: [
          {
            label: "Best Position",
            value: positionNames[bestWinRatePosition.position],
            unit: "",
            context: `${bestWinRatePosition.winRate.toFixed(1)}% WR`
          },
          {
            label: "Win Rate",
            value: bestWinRatePosition.winRate.toFixed(1),
            unit: "%",
            context: `${bestWinRatePosition.wins}W-${bestWinRatePosition.losses}L`
          },
          {
            label: "Most Played",
            value: positionNames[mostPlayedPosition.position],
            unit: "",
            context: `${mostPlayedPosition.games} games`
          },
          {
            label: "Positions Played",
            value: playedPositions,
            unit: "",
            context: isFlexPlayer ? "Flex Player" : "Specialist"
          }
        ],
        vizData: {
          type: "position_statistics",
          positions: positionStatsList.map(stat => ({
            position: positionNames[stat.position as Position],
            positionKey: stat.position,
            games: stat.games,
            wins: stat.wins,
            losses: stat.losses,
            winRate: stat.winRate,
            avgKDA: stat.avgKDA,
            isBestWinRate: stat.position === bestWinRatePosition.position,
            isMostPlayed: stat.position === mostPlayedPosition.position
          })),
          bestWinRatePosition: {
            position: positionNames[bestWinRatePosition.position],
            positionKey: bestWinRatePosition.position,
            games: bestWinRatePosition.games,
            wins: bestWinRatePosition.wins,
            losses: bestWinRatePosition.losses,
            winRate: bestWinRatePosition.winRate,
            avgKDA: bestWinRatePosition.avgKDA
          },
          mostPlayedPosition: {
            position: positionNames[mostPlayedPosition.position],
            positionKey: mostPlayedPosition.position,
            games: mostPlayedPosition.games,
            wins: mostPlayedPosition.wins,
            losses: mostPlayedPosition.losses,
            winRate: mostPlayedPosition.winRate,
            avgKDA: mostPlayedPosition.avgKDA
          },
          playedPositions,
          isFlexPlayer,
          isSpecialist,
          // Bar chart data for win rate by position
          categories: positionStatsList.map(stat => positionNames[stat.position as Position]),
          values: positionStatsList.map(stat => stat.winRate),
          colors: positionStatsList.map(stat => 
            stat.position === bestWinRatePosition.position ? '#10B981' : '#3B82F6'
          )
        }
      }
    };
    
  } catch (error) {
    console.error('Error in computeSignaturePosition:', error);
    
    // Fallback to mock data if real data fails
    return {
      sceneId: "signature_position",
      vizKind: "bar",
      insight: {
        summary: "Unable to load position statistics. Using sample data for demonstration.",
        details: [
          "Could not fetch your position statistics",
          "This might be due to API limitations or no recent matches",
          "Sample data shown for demonstration purposes"
        ],
        action: "Play some games and try again later",
        metrics: [
          { label: "Best Position", value: "N/A" },
          { label: "Win Rate", value: "N/A" },
          { label: "Most Played", value: "N/A" },
          { label: "Positions Played", value: 0, unit: "" }
        ],
        vizData: {
          type: "position_statistics",
          positions: [],
          categories: [],
          values: [],
          colors: []
        }
      }
    };
  }
}
