import { ScenePayload, MatchParticipant } from '../types';
import { fetchMatchDetailFromCache } from '../riot';

// Type guard to check if participant is a MatchParticipant
function isMatchParticipant(participant: MatchParticipant | { puuid: string; riotIdGameName: string }): participant is MatchParticipant {
  return 'goldEarned' in participant && 'win' in participant;
}

export async function computeSniper(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeSniper] Starting for ${ctx.puuid} - ANALYZING SKILLSHOT ACCURACY`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeSniper] Using ${matchIds.length} cached match IDs`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Track skillshot statistics
    let totalSkillshotsHit = 0;
    let processedMatches = 0;
    let gamesWithSkillshotData = 0;
    
    // Track best accuracy game
    let bestAccuracyGame = {
      skillshots: 0,
      matchId: '',
      date: '',
      championName: '',
      kills: 0,
      assists: 0
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
        const skillshotsHit = playerParticipant.skillshotsHit || 0;
        
        if (skillshotsHit > 0) {
          gamesWithSkillshotData++;
          totalSkillshotsHit += skillshotsHit;
          
          // Track best accuracy game
          if (skillshotsHit > bestAccuracyGame.skillshots) {
            bestAccuracyGame = {
              skillshots: skillshotsHit,
              matchId: match.gameId,
              date: gameDate,
              championName: playerParticipant.championName,
              kills: playerParticipant.kills,
              assists: playerParticipant.assists
            };
          }
        }
      }
    }
    
    if (processedMatches === 0) {
      throw new Error('No valid matches to analyze');
    }
    
    // Calculate averages
    const avgSkillshotsPerGame = totalSkillshotsHit / processedMatches;
    const avgSkillshotsPerGameWithData = gamesWithSkillshotData > 0 ? totalSkillshotsHit / gamesWithSkillshotData : 0;
    
    // Determine accuracy rating
    let accuracyRating = 'Developing';
    let accuracyEmoji = '🎯';
    
    if (avgSkillshotsPerGame >= 50) {
      accuracyRating = 'Legendary Sniper';
      accuracyEmoji = '🎖️';
    } else if (avgSkillshotsPerGame >= 35) {
      accuracyRating = 'Elite Marksman';
      accuracyEmoji = '🏹';
    } else if (avgSkillshotsPerGame >= 25) {
      accuracyRating = 'Sharpshooter';
      accuracyEmoji = '🔫';
    } else if (avgSkillshotsPerGame >= 15) {
      accuracyRating = 'Skilled Aimer';
      accuracyEmoji = '🎯';
    } else if (avgSkillshotsPerGame >= 10) {
      accuracyRating = 'Accuracy Builder';
      accuracyEmoji = '✨';
    }
    
    console.log(`[computeSniper] Analysis complete:`, {
      totalSkillshots: totalSkillshotsHit,
      avgPerGame: avgSkillshotsPerGame.toFixed(1),
      gamesWithData: gamesWithSkillshotData,
      rating: accuracyRating
    });
    
    // Build visualization data
    const vizData = {
      type: 'highlight',
      mainStat: {
        label: 'Total Skillshots Hit',
        value: totalSkillshotsHit,
        unit: 'hits'
      },
      subStats: [
        {
          label: 'Average Per Game',
          value: avgSkillshotsPerGame.toFixed(1),
          color: '#3B82F6'
        },
        {
          label: 'Best Game',
          value: bestAccuracyGame.skillshots,
          color: '#10B981'
        },
        {
          label: 'Games Analyzed',
          value: processedMatches,
          color: '#6B7280'
        }
      ]
    };
    
    // Build insight summary
    const details: string[] = [
      `Analyzed ${processedMatches} matches for skillshot accuracy`,
      `Games with skillshot data: ${gamesWithSkillshotData}`,
      '',
      '🎯 Accuracy Statistics:',
      `  Total Skillshots Hit: ${totalSkillshotsHit}`,
      `  Average per game: ${avgSkillshotsPerGame.toFixed(1)}`,
      `  Average (with data): ${avgSkillshotsPerGameWithData.toFixed(1)}`,
      ''
    ];
    
    // Add best accuracy game
    if (bestAccuracyGame.skillshots > 0) {
      details.push('🏆 Best Accuracy Game:');
      details.push(`  ${bestAccuracyGame.championName} (${bestAccuracyGame.date})`);
      details.push(`  ${bestAccuracyGame.skillshots} skillshots landed`);
      details.push(`  ${bestAccuracyGame.kills}/${bestAccuracyGame.assists} K/A`);
      details.push('');
    }
    
    // Performance analysis
    if (avgSkillshotsPerGame >= 35) {
      details.push('🎖️ Incredible accuracy! Your skillshot precision is elite-tier.');
    } else if (avgSkillshotsPerGame >= 25) {
      details.push('🏹 Excellent aim! You\'re consistently landing skillshots.');
    } else if (avgSkillshotsPerGame >= 15) {
      details.push('🎯 Good accuracy! Keep practicing prediction and positioning.');
    } else if (avgSkillshotsPerGame >= 10) {
      details.push('✨ Decent skillshot usage. Focus on prediction and enemy movement patterns.');
    } else {
      details.push('🌱 Room to grow! Practice skillshot prediction in practice tool.');
    }
    
    // Data availability note
    if (gamesWithSkillshotData < processedMatches / 2) {
      details.push('');
      details.push('ℹ️ Note: Limited skillshot data available. Stats may not reflect all games.');
    }
    
    let summary = '';
    let action = '';
    
    if (gamesWithSkillshotData === 0) {
      summary = 'No skillshot data available for your matches. This stat may not be tracked for all champions or game modes.';
      action = 'Play skillshot-heavy champions like Ezreal, Lux, or Xerath to see this stat populate!';
    } else if (avgSkillshotsPerGame >= 35) {
      summary = `${accuracyEmoji} ${accuracyRating}! You've landed ${totalSkillshotsHit} skillshots across ${processedMatches} games, averaging ${avgSkillshotsPerGame.toFixed(1)} per game. Your best performance was ${bestAccuracyGame.skillshots} skillshots on ${bestAccuracyGame.championName}! Your mechanical precision is outstanding.`;
      action = 'Your aim is already elite! Focus on using skillshots for zoning and objective control, not just kills.';
    } else if (avgSkillshotsPerGame >= 20) {
      summary = `${accuracyEmoji} ${accuracyRating}! With ${totalSkillshotsHit} skillshots landed (${avgSkillshotsPerGame.toFixed(1)} per game), you're showing strong mechanical skill. Your peak was ${bestAccuracyGame.skillshots} skillshots on ${bestAccuracyGame.championName}.`;
      action = 'Great accuracy! Work on: 1) Predicting enemy movement, 2) Using fog of war for surprise angles, 3) Animation canceling.';
    } else if (avgSkillshotsPerGame >= 10) {
      summary = `${accuracyEmoji} ${accuracyRating}. You've hit ${totalSkillshotsHit} skillshots across ${processedMatches} games (${avgSkillshotsPerGame.toFixed(1)} average). Your best game was ${bestAccuracyGame.skillshots} hits on ${bestAccuracyGame.championName}.`;
      action = 'Improve accuracy by: 1) Watching enemy movement patterns, 2) Aiming where they\'re going not where they are, 3) Practice combos in practice tool.';
    } else {
      summary = `${accuracyEmoji} ${accuracyRating}. With ${totalSkillshotsHit} skillshots hit (${avgSkillshotsPerGame.toFixed(1)} per game), there's potential to improve. ${gamesWithSkillshotData < processedMatches ? 'Limited data available for some matches.' : ''}`;
      action = 'Priority: 1) Play skillshot champions in normals to practice, 2) Use practice tool, 3) Watch high-elo players to learn prediction patterns.';
    }
    
    const payload: ScenePayload = {
      sceneId: 'sniper',
      vizKind: 'highlight',
      insight: {
        summary,
        details,
        action,
        metrics: [
          {
            label: 'Total Skillshots',
            value: totalSkillshotsHit,
            context: accuracyRating
          },
          {
            label: 'Average Per Game',
            value: avgSkillshotsPerGame.toFixed(1),
            unit: 'hits',
            context: `across ${processedMatches} games`
          },
          {
            label: 'Best Game',
            value: bestAccuracyGame.skillshots,
            unit: 'hits',
            context: bestAccuracyGame.championName || 'N/A'
          },
          {
            label: 'Data Coverage',
            value: gamesWithSkillshotData,
            context: `of ${processedMatches} games`
          }
        ],
        vizData
      }
    };
    
    console.log(`[computeSniper] Returning payload for sniper`);
    return payload;
    
  } catch (error) {
    console.error('[computeSniper] Error:', error);
    
    return {
      sceneId: 'sniper',
      vizKind: 'highlight',
      insight: {
        summary: 'Unable to analyze skillshot accuracy',
        details: [
          'There was an error processing your match data',
          error instanceof Error ? error.message : 'Unknown error'
        ],
        action: 'Please try again later or contact support if the issue persists',
        metrics: [],
        vizData: {}
      }
    };
  }
}
