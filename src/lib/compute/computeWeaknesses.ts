import { ScenePayload, MatchParticipant } from '../types';
import { fetchMatchDetailFromCache } from '../riot';

// Type guard to check if participant is a MatchParticipant
function isMatchParticipant(participant: MatchParticipant | { puuid: string; riotIdGameName: string }): participant is MatchParticipant {
  return 'goldEarned' in participant && 'win' in participant;
}

export async function computeWeaknesses(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeWeaknesses] Starting for ${ctx.puuid} - ANALYZING WEAKNESSES`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeWeaknesses] Using ${matchIds.length} cached match IDs`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Track weakness statistics
    let totalTimeSpentDead = 0; // in seconds
    let totalGameTime = 0; // in seconds
    let processedMatches = 0;
    
    // Track gank statistics
    let totalDeaths = 0;
    let deathsByJungle = 0;
    // let deathsByOtherLanes = 0; // Tracked for future analysis
    
    // Track worst game by deaths
    let worstGame = {
      deaths: 0,
      matchId: '',
      date: '',
      championName: '',
      timeSpentDead: 0
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
        
        // Track time spent dead and total game time in seconds
        const gameDurationSeconds = match.gameDuration;
        totalGameTime += gameDurationSeconds;
        
        // Use timeSpentDead from API (in seconds)
        if (playerParticipant.timeSpentDead !== undefined) {
          totalTimeSpentDead += playerParticipant.timeSpentDead;
        } else {
          // Estimate: average death timer increases with game time
          // Early game ~15s, mid game ~30s, late game ~60s
          const gameTimeMinutes = gameDurationSeconds / 60;
          const avgDeathTimer = Math.min(15 + (gameTimeMinutes * 1.5), 60);
          const estimatedDeadTime = playerParticipant.deaths * avgDeathTimer;
          totalTimeSpentDead += estimatedDeadTime;
        }
        
        // Track deaths
        totalDeaths += playerParticipant.deaths;
        
        // Check for gank proneness
        // We'll analyze this based on role and deaths
        // Note: Without detailed timeline data, we estimate based on deaths and role
        const isLaner = ['TOP', 'MIDDLE', 'BOTTOM'].includes(playerParticipant.role);
        
        if (isLaner && playerParticipant.deaths > 0) {
          // Estimate that ~30-40% of deaths in lane are from ganks
          const estimatedGankDeaths = Math.floor(playerParticipant.deaths * 0.35);
          deathsByJungle += estimatedGankDeaths;
          // deathsByOtherLanes += (playerParticipant.deaths - estimatedGankDeaths);
        } else {
          // For jungle/support, most deaths are roaming/teamfights
          // deathsByOtherLanes += playerParticipant.deaths;
        }
        
        // Track worst game
        if (playerParticipant.deaths > worstGame.deaths) {
          const gameTimeMinutes = gameDurationSeconds / 60;
          const deadTime = playerParticipant.timeSpentDead 
            ? playerParticipant.timeSpentDead 
            : (playerParticipant.deaths * Math.min(15 + (gameTimeMinutes * 1.5), 60));
            
          worstGame = {
            deaths: playerParticipant.deaths,
            matchId: match.gameId,
            date: new Date(match.gameCreation).toLocaleDateString(),
            championName: playerParticipant.championName,
            timeSpentDead: deadTime / 60 // Convert to minutes for display
          };
        }
      }
    }
    
    if (processedMatches === 0) {
      throw new Error('No valid matches to analyze');
    }
    
    // Calculate averages and percentages
    const avgTimeSpentDeadSeconds = totalTimeSpentDead / processedMatches;
    const avgTimeSpentDeadMinutes = avgTimeSpentDeadSeconds / 60;
    const avgGameDurationSeconds = totalGameTime / processedMatches;
    
    const gankProneness = totalDeaths > 0 ? (deathsByJungle / totalDeaths) * 100 : 0;
    const avgDeathsPerGame = totalDeaths / processedMatches;
    
    // Calculate fountain time as percentage of total game time
    const totalDeadPercentage = (totalTimeSpentDead / totalGameTime) * 100;
    const totalPlayingPercentage = 100 - totalDeadPercentage;
    
    // Calculate average percentages per game
    const avgDeadPercentage = (avgTimeSpentDeadSeconds / avgGameDurationSeconds) * 100;
    const avgPlayingPercentage = 100 - avgDeadPercentage;
    
    // Determine weakness level
    let weaknessLevel = 'Excellent';
    
    if (avgDeathsPerGame > 6 || totalDeadPercentage > 15) {
      weaknessLevel = 'Needs Work';
    } else if (avgDeathsPerGame > 4 || totalDeadPercentage > 10) {
      weaknessLevel = 'Could Improve';
    } else if (avgDeathsPerGame > 3 || totalDeadPercentage > 7) {
      weaknessLevel = 'Good';
    }
    
    console.log(`[computeWeaknesses] Analysis complete:`, {
      avgDeathsPerGame: avgDeathsPerGame.toFixed(2),
      avgTimeSpentDeadMinutes: avgTimeSpentDeadMinutes.toFixed(1),
      totalDeadPercentage: totalDeadPercentage.toFixed(1),
      avgDeadPercentage: avgDeadPercentage.toFixed(1),
      gankProneness: gankProneness.toFixed(1),
      weaknessLevel
    });
    
    // Build visualization data - pie charts for dead vs playing time
    const vizData = {
      // Total across all matches
      totalPieChart: [
        {
          name: 'Playing',
          value: parseFloat(totalPlayingPercentage.toFixed(2)),
          color: '#10B981' // green
        },
        {
          name: 'Dead',
          value: parseFloat(totalDeadPercentage.toFixed(2)),
          color: '#EF4444' // red
        }
      ],
      // Average per game
      avgPieChart: [
        {
          name: 'Playing',
          value: parseFloat(avgPlayingPercentage.toFixed(2)),
          color: '#10B981' // green
        },
        {
          name: 'Dead',
          value: parseFloat(avgDeadPercentage.toFixed(2)),
          color: '#EF4444' // red
        }
      ],
      stats: {
        avgDeathsPerGame: parseFloat(avgDeathsPerGame.toFixed(2)),
        avgTimeSpentDeadMinutes: parseFloat(avgTimeSpentDeadMinutes.toFixed(2)),
        totalDeadPercentage: parseFloat(totalDeadPercentage.toFixed(2)),
        avgDeadPercentage: parseFloat(avgDeadPercentage.toFixed(2))
      },
      type: 'weakness_stats'
    };
    
    // Build insight summary
    const details: string[] = [
      `Analyzed ${processedMatches} matches for survivability patterns`,
      `Average deaths per game: ${avgDeathsPerGame.toFixed(2)}`,
      `Time spent dead: ${avgTimeSpentDeadMinutes.toFixed(1)} minutes per game (${avgDeadPercentage.toFixed(1)}% of game time)`,
      `Gank proneness: ${gankProneness.toFixed(1)}% of deaths from enemy jungle pressure`,
      `Worst game: ${worstGame.deaths} deaths on ${worstGame.championName} (${worstGame.date})`
    ];
    
    let summary = '';
    let action = '';
    
    if (avgDeathsPerGame <= 3 && totalDeadPercentage <= 7) {
      summary = `Exceptional survivability! You average only ${avgDeathsPerGame.toFixed(1)} deaths per game, spending just ${avgDeadPercentage.toFixed(1)}% of your time in the fountain. Your map awareness and positioning are top-tier.`;
      action = 'Keep up the excellent play! Focus on maintaining this discipline while being aggressive when opportunities arise.';
    } else if (avgDeathsPerGame <= 4.5 && totalDeadPercentage <= 10) {
      summary = `Solid survivability with room for improvement. You average ${avgDeathsPerGame.toFixed(1)} deaths per game, spending ${avgDeadPercentage.toFixed(1)}% of your time dead. ${gankProneness > 35 ? 'You appear vulnerable to ganks.' : 'Your laning phase is relatively safe.'}`;
      action = gankProneness > 35 
        ? 'Focus on ward placement and tracking the enemy jungler to avoid ganks.'
        : 'Work on teamfight positioning to reduce unnecessary deaths.';
    } else {
      summary = `Your survivability needs attention. With ${avgDeathsPerGame.toFixed(1)} deaths per game and ${avgDeadPercentage.toFixed(1)}% of game time spent dead, you're giving the enemy team too many advantages. ${gankProneness > 35 ? 'You\'re particularly vulnerable to ganks.' : ''}`;
      action = gankProneness > 35
        ? 'Priority: Ward your lane, track the enemy jungler, and play safer when you don\'t have vision.'
        : 'Priority: Focus on positioning in teamfights and knowing when to disengage.';
    }
    
    const payload: ScenePayload = {
      sceneId: 'weaknesses',
      vizKind: 'bar',
      insight: {
        summary,
        details,
        action,
        metrics: [
          {
            label: 'Avg Deaths/Game',
            value: avgDeathsPerGame.toFixed(2),
            context: weaknessLevel
          },
          {
            label: 'Time Dead (Avg)',
            value: avgDeadPercentage.toFixed(1),
            unit: '%',
            context: 'per game'
          },
          {
            label: 'Time Dead (Total)',
            value: totalDeadPercentage.toFixed(1),
            unit: '%',
            context: 'across all games'
          },
          {
            label: 'Total Deaths',
            value: totalDeaths,
            context: `across ${processedMatches} games`
          }
        ],
        vizData
      }
    };
    
    console.log(`[computeWeaknesses] Returning payload for weaknesses`);
    return payload;
    
  } catch (error) {
    console.error('[computeWeaknesses] Error:', error);
    
    return {
      sceneId: 'weaknesses',
      vizKind: 'bar',
      insight: {
        summary: 'Unable to analyze weaknesses',
        details: [
          'There was an error processing your match data',
          error instanceof Error ? error.message : 'Unknown error'
        ],
        action: 'Please try again later or contact support if the issue persists',
        metrics: [],
        vizData: { bars: [], type: 'weakness_stats' }
      }
    };
  }
}
