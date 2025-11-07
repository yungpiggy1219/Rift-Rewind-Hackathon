import { ScenePayload, MatchParticipant } from '../types';
import { fetchMatchDetailFromCache } from '../riot';

// Type guard to check if participant is a MatchParticipant
function isMatchParticipant(participant: MatchParticipant | { puuid: string; riotIdGameName: string }): participant is MatchParticipant {
  return 'goldEarned' in participant && 'win' in participant;
}

interface AllyStats {
  puuid: string;
  riotIdGameName: string;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  championsSeen: string[];
  totalTimePlayedTogether: number; // in minutes
  recentGames: Array<{
    date: string;
    won: boolean;
    championName: string;
  }>;
}

export async function computeAllies(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeAllies] Starting for ${ctx.puuid} - ANALYZING ALLIES`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeAllies] Using ${matchIds.length} cached match IDs`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Track ally statistics
    const allyMap = new Map<string, AllyStats>();
    let processedMatches = 0;
    
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
      
      const matchResults = await Promise.all(matchPromises);
      
      for (const match of matchResults) {
        if (!match) continue;
        
        // Find the player's participant data
        const playerParticipant = match.participants.find((p) => p.puuid === ctx.puuid);
        
        if (!playerParticipant || !isMatchParticipant(playerParticipant)) {
          continue;
        }
        
        processedMatches++;
        
        const gameTimeMinutes = match.gameDuration / 60;
        const gameDate = new Date(match.gameCreation).toLocaleDateString();
        const playerWon = playerParticipant.win;
        const playerTeamId = playerParticipant.teamId;
        
        // Find all teammates (same team)
        const teammates = match.participants.filter((p) => {
          if (p.puuid === ctx.puuid) return false; // Skip the player themselves
          
          // Check if on same team
          if (isMatchParticipant(p)) {
            // If both have teamId, compare them
            if (playerTeamId !== undefined && p.teamId !== undefined) {
              return p.teamId === playerTeamId;
            }
            // Otherwise, use win status (teammates have same win status)
            return p.win === playerWon;
          }
          
          return false;
        });
        
        // Track each teammate
        for (const teammate of teammates) {
          const ally = allyMap.get(teammate.puuid) || {
            puuid: teammate.puuid,
            riotIdGameName: teammate.riotIdGameName,
            gamesPlayed: 0,
            wins: 0,
            winRate: 0,
            championsSeen: [],
            totalTimePlayedTogether: 0,
            recentGames: []
          };
          
          ally.gamesPlayed++;
          if (playerWon) ally.wins++;
          ally.totalTimePlayedTogether += gameTimeMinutes;
          
          // Track champion if available
          if (isMatchParticipant(teammate) && teammate.championName) {
            if (!ally.championsSeen.includes(teammate.championName)) {
              ally.championsSeen.push(teammate.championName);
            }
            
            // Keep recent games (limit to 5 most recent)
            if (ally.recentGames.length < 5) {
              ally.recentGames.push({
                date: gameDate,
                won: playerWon,
                championName: teammate.championName
              });
            }
          }
          
          ally.winRate = (ally.wins / ally.gamesPlayed) * 100;
          allyMap.set(teammate.puuid, ally);
        }
      }
    }
    
    if (processedMatches === 0) {
      throw new Error('No valid matches to analyze');
    }
    
    if (allyMap.size === 0) {
      // No allies found (all solo queue)
      return {
        sceneId: 'best_friend',
        vizKind: 'badge',
        insight: {
          summary: 'The Lone Wolf',
          details: [
            `Analyzed ${processedMatches} matches`,
            'No recurring teammates found in your match history',
            'You\'re playing solo queue exclusively!'
          ],
          action: 'Consider finding a duo partner to improve coordination and climb together.',
          metrics: [
            {
              label: 'Matches Analyzed',
              value: processedMatches,
              context: 'All solo queue'
            }
          ],
          vizData: {
            type: 'badge',
            title: 'Solo Player',
            subtitle: 'No recurring allies',
            icon: '🐺',
            stats: []
          }
        }
      };
    }
    
    // Find the most frequent ally
    const allies = Array.from(allyMap.values()).sort((a, b) => b.gamesPlayed - a.gamesPlayed);
    const bestAlly = allies[0];
    
    // Calculate total time together in hours
    const totalHoursTogether = bestAlly.totalTimePlayedTogether / 60;
    
    // Determine relationship level
    let relationshipLevel = 'Acquaintance';
    let relationshipEmoji = '👋';
    
    if (bestAlly.gamesPlayed >= 50) {
      relationshipLevel = 'Inseparable Duo';
      relationshipEmoji = '💎';
    } else if (bestAlly.gamesPlayed >= 20) {
      relationshipLevel = 'Trusted Partner';
      relationshipEmoji = '🤝';
    } else if (bestAlly.gamesPlayed >= 10) {
      relationshipLevel = 'Regular Duo';
      relationshipEmoji = '⭐';
    } else if (bestAlly.gamesPlayed >= 5) {
      relationshipLevel = 'Frequent Ally';
      relationshipEmoji = '✨';
    }
    
    console.log(`[computeAllies] Analysis complete:`, {
      bestAlly: bestAlly.riotIdGameName,
      gamesPlayed: bestAlly.gamesPlayed,
      winRate: bestAlly.winRate.toFixed(1),
      hoursTogether: totalHoursTogether.toFixed(1),
      relationshipLevel
    });
    
    // Build visualization data
    const vizData = {
      type: 'badge',
      title: bestAlly.riotIdGameName,
      subtitle: relationshipLevel,
      icon: relationshipEmoji,
      puuid: bestAlly.puuid, // Add puuid for SummonerCard
      stats: [
        {
          label: 'Games Together',
          value: bestAlly.gamesPlayed,
          color: '#8B5CF6'
        },
        {
          label: 'Win Rate',
          value: `${bestAlly.winRate.toFixed(1)}%`,
          color: bestAlly.winRate >= 55 ? '#10B981' : bestAlly.winRate >= 45 ? '#F59E0B' : '#EF4444'
        },
        {
          label: 'Hours Together',
          value: `${totalHoursTogether.toFixed(1)}h`,
          color: '#3B82F6'
        },
        {
          label: 'Champions Seen',
          value: bestAlly.championsSeen.length,
          color: '#EC4899'
        }
      ],
      recentGames: bestAlly.recentGames
    };
    
    // Build insight summary
    const winRateComparison = bestAlly.winRate >= 55 ? 'crushing it' : bestAlly.winRate >= 50 ? 'holding your own' : 'struggling a bit';
    const timeCommitment = totalHoursTogether >= 50 ? 'massive' : totalHoursTogether >= 20 ? 'significant' : totalHoursTogether >= 10 ? 'solid' : 'modest';
    
    const details: string[] = [
      `Analyzed ${processedMatches} matches across all teammates`,
      `Found ${allies.length} unique allies in your match history`,
      `Most played with: ${bestAlly.riotIdGameName} (${bestAlly.gamesPlayed} games)`,
      `Win rate together: ${bestAlly.winRate.toFixed(1)}% (${bestAlly.wins}W-${bestAlly.gamesPlayed - bestAlly.wins}L)`,
      `Time spent together: ${totalHoursTogether.toFixed(1)} hours`,
      `Champions they played: ${bestAlly.championsSeen.slice(0, 3).join(', ')}${bestAlly.championsSeen.length > 3 ? ` +${bestAlly.championsSeen.length - 3} more` : ''}`
    ];
    
    // Top 3 allies
    if (allies.length > 1) {
      details.push('');
      details.push('Other notable allies:');
      allies.slice(1, 4).forEach((ally, idx) => {
        details.push(`${idx + 2}. ${ally.riotIdGameName} - ${ally.gamesPlayed} games (${ally.winRate.toFixed(1)}% WR)`);
      });
    }
    
    const summary = `Your most trusted ally is ${bestAlly.riotIdGameName}! You've played ${bestAlly.gamesPlayed} games together, spending ${totalHoursTogether.toFixed(1)} hours on the Rift as a duo. Together, you're ${winRateComparison} with a ${bestAlly.winRate.toFixed(1)}% win rate. That's a ${timeCommitment} time investment in your partnership!`;
    
    let action = '';
    if (bestAlly.winRate >= 55) {
      action = `Keep queuing with ${bestAlly.riotIdGameName} - your synergy is paying off! This duo has winning potential.`;
    } else if (bestAlly.winRate >= 45) {
      action = `You and ${bestAlly.riotIdGameName} have solid chemistry. Focus on improving communication and draft synergy to boost that win rate.`;
    } else {
      action = `Consider analyzing what's not working with ${bestAlly.riotIdGameName}. Sometimes a fresh duo partner can make all the difference.`;
    }
    
    const payload: ScenePayload = {
      sceneId: 'best_friend',
      vizKind: 'badge',
      insight: {
        summary,
        details,
        action,
        metrics: [
          {
            label: 'Best Friend',
            value: bestAlly.riotIdGameName,
            context: relationshipLevel
          },
          {
            label: 'Games Together',
            value: bestAlly.gamesPlayed,
            context: `${bestAlly.wins}W-${bestAlly.gamesPlayed - bestAlly.wins}L`
          },
          {
            label: 'Duo Win Rate',
            value: bestAlly.winRate.toFixed(1),
            unit: '%',
            context: winRateComparison
          },
          {
            label: 'Time Together',
            value: totalHoursTogether.toFixed(1),
            unit: 'hours',
            context: 'on the Rift'
          }
        ],
        vizData
      }
    };
    
    console.log(`[computeAllies] Returning payload for best_friend`);
    return payload;
    
  } catch (error) {
    console.error('[computeAllies] Error:', error);
    
    return {
      sceneId: 'best_friend',
      vizKind: 'badge',
      insight: {
        summary: 'Unable to analyze allies',
        details: [
          'There was an error processing your match data',
          error instanceof Error ? error.message : 'Unknown error'
        ],
        action: 'Please try again later or contact support if the issue persists',
        metrics: [],
        vizData: {
          type: 'badge',
          title: 'Error',
          subtitle: 'Unable to load',
          icon: '❌',
          stats: []
        }
      }
    };
  }
}
