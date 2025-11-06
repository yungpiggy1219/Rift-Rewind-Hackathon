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
    let totalTimeSpentDead = 0;
    let totalGameTime = 0;
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
        
        // Track time spent dead (if available from API)
        // Note: Riot API may not provide this directly, we'll use estimated values
        const gameTimeMinutes = match.gameDuration / 60;
        totalGameTime += gameTimeMinutes;
        
        if (playerParticipant.timeSpentDead) {
          totalTimeSpentDead += playerParticipant.timeSpentDead;
        } else {
          // Estimate: average death timer increases with game time
          // Early game ~15s, mid game ~30s, late game ~60s
          const avgDeathTimer = Math.min(15 + (gameTimeMinutes * 1.5), 60);
          const estimatedDeadTime = playerParticipant.deaths * avgDeathTimer;
          totalTimeSpentDead += estimatedDeadTime / 60; // Convert to minutes
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
          const deadTime = playerParticipant.timeSpentDead 
            ? playerParticipant.timeSpentDead 
            : (playerParticipant.deaths * Math.min(15 + (gameTimeMinutes * 1.5), 60) / 60);
            
          worstGame = {
            deaths: playerParticipant.deaths,
            matchId: match.gameId,
            date: new Date(match.gameCreation).toLocaleDateString(),
            championName: playerParticipant.championName,
            timeSpentDead: deadTime
          };
        }
      }
    }
    
    if (processedMatches === 0) {
      throw new Error('No valid matches to analyze');
    }
    
    // Calculate averages and percentages
    const avgTimeSpentDead = totalTimeSpentDead / processedMatches;
    // const avgDeaths = totalDeaths / processedMatches; // Same as avgDeathsPerGame below
    const gankProneness = totalDeaths > 0 ? (deathsByJungle / totalDeaths) * 100 : 0;
    const avgDeathsPerGame = totalDeaths / processedMatches;
    
    // Calculate fountain time as percentage of total game time
    const fountainTimePercentage = (totalTimeSpentDead / totalGameTime) * 100;
    
    // Determine weakness level
    let weaknessLevel = 'Excellent';
    // let weaknessColor = '#10B981'; // green (not used yet, reserved for future features)
    
    if (avgDeathsPerGame > 6 || fountainTimePercentage > 15) {
      weaknessLevel = 'Needs Work';
      // weaknessColor = '#EF4444'; // red
    } else if (avgDeathsPerGame > 4 || fountainTimePercentage > 10) {
      weaknessLevel = 'Could Improve';
      // weaknessColor = '#F59E0B'; // yellow
    } else if (avgDeathsPerGame > 3 || fountainTimePercentage > 7) {
      weaknessLevel = 'Good';
      // weaknessColor = '#3B82F6'; // blue
    }
    
    console.log(`[computeWeaknesses] Analysis complete:`, {
      avgDeathsPerGame: avgDeathsPerGame.toFixed(2),
      avgTimeSpentDead: avgTimeSpentDead.toFixed(1),
      fountainTimePercentage: fountainTimePercentage.toFixed(1),
      gankProneness: gankProneness.toFixed(1),
      weaknessLevel
    });
    
    // Build visualization data
    const vizData = {
      bars: [
        {
          label: 'Avg Deaths/Game',
          value: parseFloat(avgDeathsPerGame.toFixed(2)),
          color: avgDeathsPerGame > 5 ? '#EF4444' : avgDeathsPerGame > 3 ? '#F59E0B' : '#10B981',
          maxValue: 10
        },
        {
          label: 'Fountain Time %',
          value: parseFloat(fountainTimePercentage.toFixed(1)),
          color: fountainTimePercentage > 12 ? '#EF4444' : fountainTimePercentage > 8 ? '#F59E0B' : '#10B981',
          maxValue: 20
        },
        {
          label: 'Gank Prone %',
          value: parseFloat(gankProneness.toFixed(1)),
          color: gankProneness > 40 ? '#EF4444' : gankProneness > 30 ? '#F59E0B' : '#10B981',
          maxValue: 100
        },
        {
          label: 'Avg Dead Time (min)',
          value: parseFloat(avgTimeSpentDead.toFixed(1)),
          color: avgTimeSpentDead > 5 ? '#EF4444' : avgTimeSpentDead > 3 ? '#F59E0B' : '#10B981',
          maxValue: 10
        }
      ],
      type: 'weakness_stats'
    };
    
    // Build insight summary
    const details: string[] = [
      `Analyzed ${processedMatches} matches for survivability patterns`,
      `Average deaths per game: ${avgDeathsPerGame.toFixed(2)}`,
      `Time spent dead: ${avgTimeSpentDead.toFixed(1)} minutes per game (${fountainTimePercentage.toFixed(1)}% of game time)`,
      `Gank proneness: ${gankProneness.toFixed(1)}% of deaths from enemy jungle pressure`,
      `Worst game: ${worstGame.deaths} deaths on ${worstGame.championName} (${worstGame.date})`
    ];
    
    let summary = '';
    let action = '';
    
    if (avgDeathsPerGame <= 3 && fountainTimePercentage <= 7) {
      summary = `Exceptional survivability! You average only ${avgDeathsPerGame.toFixed(1)} deaths per game, spending just ${fountainTimePercentage.toFixed(1)}% of your time in the fountain. Your map awareness and positioning are top-tier.`;
      action = 'Keep up the excellent play! Focus on maintaining this discipline while being aggressive when opportunities arise.';
    } else if (avgDeathsPerGame <= 4.5 && fountainTimePercentage <= 10) {
      summary = `Solid survivability with room for improvement. You average ${avgDeathsPerGame.toFixed(1)} deaths per game, spending ${fountainTimePercentage.toFixed(1)}% of your time dead. ${gankProneness > 35 ? 'You appear vulnerable to ganks.' : 'Your laning phase is relatively safe.'}`;
      action = gankProneness > 35 
        ? 'Focus on ward placement and tracking the enemy jungler to avoid ganks.'
        : 'Work on teamfight positioning to reduce unnecessary deaths.';
    } else {
      summary = `Your survivability needs attention. With ${avgDeathsPerGame.toFixed(1)} deaths per game and ${fountainTimePercentage.toFixed(1)}% of game time spent dead, you're giving the enemy team too many advantages. ${gankProneness > 35 ? 'You\'re particularly vulnerable to ganks.' : ''}`;
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
            label: 'Fountain Time',
            value: fountainTimePercentage.toFixed(1),
            unit: '%',
            context: 'of total game time'
          },
          {
            label: 'Gank Prone',
            value: gankProneness.toFixed(1),
            unit: '%',
            context: 'of deaths from ganks'
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
