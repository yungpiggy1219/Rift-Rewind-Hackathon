import { ScenePayload, MatchParticipant } from '../types';
import { fetchMatchDetailFromCache } from '../riot';

// Type guard to check if participant is a MatchParticipant
function isMatchParticipant(participant: MatchParticipant | { puuid: string; riotIdGameName: string }): participant is MatchParticipant {
  return 'goldEarned' in participant && 'win' in participant;
}

export async function computeDragonSlayer(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeDragonSlayer] Starting for ${ctx.puuid} - ANALYZING OBJECTIVE CONTROL`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeDragonSlayer] Using ${matchIds.length} cached match IDs`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Track objective statistics
    let totalBaronKills = 0;
    let totalDragonKills = 0;
    let totalElderDragonKills = 0;
    let totalElderDragonMultikills = 0;
    let totalObjectivesStolen = 0;
    let totalObjectivesStolenAssists = 0;
    let totalSoloKills = 0;
    let processedMatches = 0;
    
    // Track team objectives (estimated from match context)
    let teamBaronsSecured = 0;
    let teamDragonsSecured = 0;
    let teamElderDragonsSecured = 0;
    
    // Track best objective game
    let bestObjectiveGame = {
      objectives: 0,
      matchId: '',
      date: '',
      championName: '',
      barons: 0,
      dragons: 0,
      elders: 0
    };
    
    // Track dragon soul games (estimate based on 4+ dragons)
    let dragonSoulsWon = 0;
    
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
        
        const gameDate = new Date(match.gameCreation).toLocaleDateString();
        
        // Track individual objective kills/assists
        const baronKills = playerParticipant.baronKills || 0;
        const dragonKills = playerParticipant.dragonKills || 0;
        const elderDragonKills = playerParticipant.elderDragonKills || 0;
        const elderDragonMultikills = playerParticipant.elderDragonMultikills || 0;
        const objectivesStolen = playerParticipant.objectivesStolen || 0;
        const objectivesStolenAssists = playerParticipant.objectivesStolenAssists || 0;
        const soloKills = playerParticipant.soloKills || 0;
        
        totalBaronKills += baronKills;
        totalDragonKills += dragonKills;
        totalElderDragonKills += elderDragonKills;
        totalElderDragonMultikills += elderDragonMultikills;
        totalObjectivesStolen += objectivesStolen;
        totalObjectivesStolenAssists += objectivesStolenAssists;
        totalSoloKills += soloKills;
        
        // Estimate team objectives
        // If player participated in baron/dragon, their team likely secured it
        if (baronKills > 0) {
          teamBaronsSecured++;
        }
        if (dragonKills > 0) {
          teamDragonsSecured++;
          
          // Estimate dragon souls (rough heuristic: if team got 4+ dragons in winning game)
          if (playerParticipant.win && dragonKills >= 4) {
            dragonSoulsWon++;
          }
        }
        if (elderDragonKills > 0) {
          teamElderDragonsSecured++;
        }
        
        // Track best objective game
        const totalObjectives = baronKills + dragonKills + elderDragonKills;
        if (totalObjectives > bestObjectiveGame.objectives) {
          bestObjectiveGame = {
            objectives: totalObjectives,
            matchId: match.gameId,
            date: gameDate,
            championName: playerParticipant.championName,
            barons: baronKills,
            dragons: dragonKills,
            elders: elderDragonKills
          };
        }
      }
    }
    
    if (processedMatches === 0) {
      throw new Error('No valid matches to analyze');
    }
    
    // Calculate averages
    const avgBaronKills = totalBaronKills / processedMatches;
    const avgDragonKills = totalDragonKills / processedMatches;
    const avgElderDragonKills = totalElderDragonKills / processedMatches;
    const avgObjectivesStolen = totalObjectivesStolen / processedMatches;
    const avgSoloKills = totalSoloKills / processedMatches;
    
    // Objective participation rate
    const objectiveParticipation = ((totalBaronKills + totalDragonKills + totalElderDragonKills) / processedMatches) * 100;
    
    // Determine objective control rating
    let objectiveRating = 'Objective Learner';
    let objectiveEmoji = '🎯';
    
    if (objectiveParticipation >= 300) {
      objectiveRating = 'Legendary Slayer';
      objectiveEmoji = '👑';
    } else if (objectiveParticipation >= 200) {
      objectiveRating = 'Dragon Master';
      objectiveEmoji = '🐉';
    } else if (objectiveParticipation >= 150) {
      objectiveRating = 'Objective Hunter';
      objectiveEmoji = '⚔️';
    } else if (objectiveParticipation >= 100) {
      objectiveRating = 'Baron Slayer';
      objectiveEmoji = '🔥';
    } else if (objectiveParticipation >= 50) {
      objectiveRating = 'Objective Aware';
      objectiveEmoji = '✨';
    }
    
    console.log(`[computeDragonSlayer] Analysis complete:`, {
      baronKills: totalBaronKills,
      dragonKills: totalDragonKills,
      elderDragonKills: totalElderDragonKills,
      soulsWon: dragonSoulsWon,
      rating: objectiveRating
    });
    
    // Build visualization data
    const vizData = {
      type: 'objective_stats',
      bars: [
        {
          label: 'Baron Kills',
          value: totalBaronKills,
          color: '#9B59B6', // Purple
          maxValue: Math.max(10, totalBaronKills)
        },
        {
          label: 'Dragon Kills',
          value: totalDragonKills,
          color: '#E74C3C', // Red/Orange
          maxValue: Math.max(50, totalDragonKills)
        },
        {
          label: 'Elder Dragons',
          value: totalElderDragonKills,
          color: '#3498DB', // Blue
          maxValue: Math.max(10, totalElderDragonKills)
        },
        {
          label: 'Objectives Stolen',
          value: totalObjectivesStolen,
          color: '#F39C12', // Gold
          maxValue: Math.max(5, totalObjectivesStolen)
        }
      ]
    };
    
    // Build insight summary
    const details: string[] = [
      `Analyzed ${processedMatches} matches for objective control`,
      `Objective participation: ${objectiveParticipation.toFixed(0)}% involvement`,
      '',
      '🐲 Dragon Statistics:',
      `  Total Dragons: ${totalDragonKills}`,
      `  Elder Dragons: ${totalElderDragonKills}`,
      `  Elder Dragon Multikills: ${totalElderDragonMultikills}`,
      `  Dragon Souls Won: ${dragonSoulsWon} (estimated)`,
      '',
      '👹 Baron Statistics:',
      `  Total Barons: ${totalBaronKills}`,
      `  Average per game: ${avgBaronKills.toFixed(2)}`,
      '',
      '⚔️ Combat Statistics:',
      `  Solo Kills: ${totalSoloKills}`,
      `  Objectives Stolen: ${totalObjectivesStolen}`,
      `  Steal Assists: ${totalObjectivesStolenAssists}`,
      ''
    ];
    
    // Add best objective game
    if (bestObjectiveGame.objectives > 0) {
      details.push('🏆 Best Objective Game:');
      details.push(`  ${bestObjectiveGame.championName} (${bestObjectiveGame.date})`);
      details.push(`  ${bestObjectiveGame.barons} Baron${bestObjectiveGame.barons !== 1 ? 's' : ''}, ${bestObjectiveGame.dragons} Dragon${bestObjectiveGame.dragons !== 1 ? 's' : ''}, ${bestObjectiveGame.elders} Elder${bestObjectiveGame.elders !== 1 ? 's' : ''}`);
      details.push('');
    }
    
    // Performance analysis
    if (avgDragonKills >= 3) {
      details.push('🐉 Excellent dragon control! You\'re consistently securing drakes.');
    } else if (avgDragonKills >= 2) {
      details.push('🔥 Good dragon presence. Keep prioritizing objectives!');
    } else if (avgDragonKills >= 1) {
      details.push('✨ Decent objective participation. Focus on being at drake spawns.');
    } else {
      details.push('🎯 Work on objective priority! Dragons and barons win games.');
    }
    
    if (totalObjectivesStolen > 0) {
      details.push(`💎 Great steals! You\'ve stolen ${totalObjectivesStolen} objectives with ${totalObjectivesStolenAssists} assists.`);
    }
    
    let summary = '';
    let action = '';
    
    if (objectiveParticipation >= 200) {
      summary = `${objectiveEmoji} ${objectiveRating}! You're a true objective king with ${totalBaronKills} Baron kills and ${totalDragonKills} Dragon kills across ${processedMatches} games. You've secured ${dragonSoulsWon} Dragon Souls and ${totalElderDragonKills} Elder Dragons. Your ${objectiveParticipation.toFixed(0)}% objective participation shows you understand win conditions!`;
      action = 'Keep dominating objectives! Your macro play is top-tier. Consider shotcalling for your team.';
    } else if (objectiveParticipation >= 100) {
      summary = `${objectiveEmoji} ${objectiveRating}! You're building strong objective control with ${totalBaronKills} Barons and ${totalDragonKills} Dragons. You've secured ${dragonSoulsWon} Dragon Souls and ${totalElderDragonKills} Elders across ${processedMatches} games. ${totalObjectivesStolen > 0 ? `Plus ${totalObjectivesStolen} clutch steals!` : ''}`;
      action = totalObjectivesStolen > 0 
        ? 'Great objective awareness! Keep timing those steals and prioritizing drakes.'
        : 'Focus on objective timing and practice smite/execute thresholds for steals!';
    } else if (objectiveParticipation >= 50) {
      summary = `${objectiveEmoji} ${objectiveRating}! You're getting involved with objectives - ${totalDragonKills} Dragons and ${totalBaronKills} Barons secured. You've helped win ${dragonSoulsWon} Dragon Souls across ${processedMatches} games.`;
      action = 'Increase objective priority! Rotate for dragons 30 seconds before spawn and group for Baron after picks.';
    } else {
      summary = `${objectiveEmoji} ${objectiveRating}. With ${totalDragonKills} Dragons and ${totalBaronKills} Barons across ${processedMatches} games, there's room to improve objective focus. Remember: objectives win games!`;
      action = 'Priority: 1) Set timers for dragon spawns (5min, then every 5min), 2) Group with team for objectives, 3) Get vision control 30s before spawn.';
    }
    
    // Add solo kill context
    if (avgSoloKills >= 1) {
      summary += ` You're also getting ${totalSoloKills} solo kills - showing strong 1v1 prowess!`;
    }
    
    const payload: ScenePayload = {
      sceneId: 'dragon_slayer',
      vizKind: 'bar',
      insight: {
        summary,
        details,
        action,
        metrics: [
          {
            label: 'Dragons Slain',
            value: totalDragonKills,
            context: `${avgDragonKills.toFixed(2)} per game`
          },
          {
            label: 'Barons Secured',
            value: totalBaronKills,
            context: `${avgBaronKills.toFixed(2)} per game`
          },
          {
            label: 'Dragon Souls',
            value: dragonSoulsWon,
            context: 'won with team'
          },
          {
            label: 'Elder Dragons',
            value: totalElderDragonKills,
            context: `${avgElderDragonKills.toFixed(2)} per game`
          },
          {
            label: 'Objectives Stolen',
            value: totalObjectivesStolen,
            unit: 'steals',
            context: totalObjectivesStolenAssists > 0 ? `+${totalObjectivesStolenAssists} assists` : 'clutch plays'
          }
        ],
        vizData
      }
    };
    
    console.log(`[computeDragonSlayer] Returning payload for dragon_slayer`);
    return payload;
    
  } catch (error) {
    console.error('[computeDragonSlayer] Error:', error);
    
    return {
      sceneId: 'dragon_slayer',
      vizKind: 'bar',
      insight: {
        summary: 'Unable to analyze objective control',
        details: [
          'There was an error processing your match data',
          error instanceof Error ? error.message : 'Unknown error'
        ],
        action: 'Please try again later or contact support if the issue persists',
        metrics: [],
        vizData: {
          type: 'objective_stats',
          bars: []
        }
      }
    };
  }
}
