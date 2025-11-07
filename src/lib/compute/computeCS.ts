import { ScenePayload, MatchParticipant } from '../types';
import { fetchMatchDetailFromCache } from '../riot';

// Type guard to check if participant is a MatchParticipant
function isMatchParticipant(participant: MatchParticipant | { puuid: string; riotIdGameName: string }): participant is MatchParticipant {
  return 'goldEarned' in participant && 'win' in participant;
}

export async function computeCS(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeCS] Starting for ${ctx.puuid} - ANALYZING CS STATS`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeCS] Using ${matchIds.length} cached match IDs`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Track CS statistics
    let totalCS = 0;
    let totalGameTime = 0; // in minutes
    let processedMatches = 0;
    
    // Track CS by month for line graph
    const csByMonth = new Map<number, { totalCS: number; totalTime: number; games: number }>();
    
    // Track best CS game
    let bestCSGame = {
      cs: 0,
      csPerMin: 0,
      matchId: '',
      date: '',
      championName: '',
      gameDuration: 0
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
        
        // Calculate CS (total minions killed + neutral minions killed)
        const totalMinionsKilled = playerParticipant.totalMinionsKilled || 0;
        const neutralMinionsKilled = playerParticipant.neutralMinionsKilled || 0;
        const matchCS = totalMinionsKilled + neutralMinionsKilled;
        
        totalCS += matchCS;
        
        // Track game duration in minutes
        const gameDurationMinutes = match.gameDuration / 60;
        totalGameTime += gameDurationMinutes;
        
        // Calculate CS per minute for this game
        const csPerMin = gameDurationMinutes > 0 ? matchCS / gameDurationMinutes : 0;
        
        // Track by month
        const matchDate = new Date(match.gameCreation);
        const month = matchDate.getMonth() + 1; // 1-12
        
        if (!csByMonth.has(month)) {
          csByMonth.set(month, { totalCS: 0, totalTime: 0, games: 0 });
        }
        
        const monthData = csByMonth.get(month)!;
        monthData.totalCS += matchCS;
        monthData.totalTime += gameDurationMinutes;
        monthData.games += 1;
        
        // Track best CS game
        if (matchCS > bestCSGame.cs) {
          bestCSGame = {
            cs: matchCS,
            csPerMin: csPerMin,
            matchId: match.gameId,
            date: matchDate.toLocaleDateString(),
            championName: playerParticipant.championName,
            gameDuration: gameDurationMinutes
          };
        }
      }
    }
    
    if (processedMatches === 0) {
      throw new Error('No valid matches to analyze');
    }
    
    // Calculate averages
    const avgCS = totalCS / processedMatches;
    const avgCSPerMin = totalCS / totalGameTime;
    const avgGameDuration = totalGameTime / processedMatches;
    
    // Build line graph data - CS per minute by month
    const chartData: Array<{ month: number; csPerMinute: number }> = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthData = csByMonth.get(month);
      if (monthData && monthData.games > 0) {
        const monthCSPerMin = monthData.totalCS / monthData.totalTime;
        chartData.push({
          month: month,
          csPerMinute: parseFloat(monthCSPerMin.toFixed(2))
        });
      }
    }
    
    // Determine farming level
    let farmingLevel = 'Learning';
    let farmingColor = '#6B7280'; // gray
    
    if (avgCSPerMin >= 8) {
      farmingLevel = 'Elite Farmer';
      farmingColor = '#F59E0B'; // gold
    } else if (avgCSPerMin >= 7) {
      farmingLevel = 'Excellent';
      farmingColor = '#10B981'; // green
    } else if (avgCSPerMin >= 6) {
      farmingLevel = 'Good';
      farmingColor = '#3B82F6'; // blue
    } else if (avgCSPerMin >= 5) {
      farmingLevel = 'Average';
      farmingColor = '#9CA3AF'; // light gray
    }
    
    console.log(`[computeCS] Analysis complete:`, {
      totalCS,
      avgCS: avgCS.toFixed(1),
      avgCSPerMin: avgCSPerMin.toFixed(2),
      bestCSGame: bestCSGame.cs,
      farmingLevel
    });
    
    // Build visualization data
    const vizData = {
      chartData,
      type: 'cs_statistics',
      stats: {
        totalCS,
        avgCS: parseFloat(avgCS.toFixed(1)),
        avgCSPerMin: parseFloat(avgCSPerMin.toFixed(2)),
        bestCS: bestCSGame.cs,
        bestCSPerMin: parseFloat(bestCSGame.csPerMin.toFixed(2))
      },
      bestCSGame: {
        cs: bestCSGame.cs,
        csPerMin: bestCSGame.csPerMin,
        championName: bestCSGame.championName,
        date: bestCSGame.date,
        gameDuration: bestCSGame.gameDuration
      }
    };
    
    // Build insight summary
    const details: string[] = [
      `Analyzed ${processedMatches} matches for farming performance`,
      `Total CS: ${totalCS.toLocaleString()} (${avgCS.toFixed(1)} per game)`,
      `Average CS/min: ${avgCSPerMin.toFixed(2)}`,
      `Best game: ${bestCSGame.cs} CS (${bestCSGame.csPerMin.toFixed(2)} CS/min) on ${bestCSGame.championName}`,
      `Average game duration: ${avgGameDuration.toFixed(1)} minutes`
    ];
    
    let summary = '';
    let action = '';
    
    if (avgCSPerMin >= 8) {
      summary = `Exceptional farming! You average ${avgCSPerMin.toFixed(2)} CS per minute across ${processedMatches} games. Your ${totalCS.toLocaleString()} total CS demonstrates elite-level farming efficiency. You're consistently maximizing your gold income.`;
      action = 'Maintain your farming discipline while looking for opportunities to translate your gold advantage into map pressure and objectives.';
    } else if (avgCSPerMin >= 6.5) {
      summary = `Strong farming performance! With ${avgCSPerMin.toFixed(2)} CS per minute and ${totalCS.toLocaleString()} total CS, you're doing well. Your best game hit ${bestCSGame.cs} CS on ${bestCSGame.championName}, showing you know how to farm effectively.`;
      action = 'Focus on maintaining your CS numbers during mid-game skirmishes and teamfights. Every wave matters!';
    } else if (avgCSPerMin >= 5) {
      summary = `Decent farming with room to grow. Your ${avgCSPerMin.toFixed(2)} CS per minute across ${processedMatches} games is respectable, but you're leaving gold on the table. You've hit ${bestCSGame.cs} CS before, so you have the potential!`;
      action = 'Work on last-hitting drills in practice tool. Aim to catch side waves and jungle camps between objectives. Target 7+ CS/min.';
    } else {
      summary = `Your farming needs attention. With ${avgCSPerMin.toFixed(2)} CS per minute, you're missing significant gold income. Better CS means more items, more power, and more wins. You've collected ${totalCS.toLocaleString()} CS total, but there's much more available.`;
      action = 'Priority: Practice last-hitting in practice tool for 10 minutes before each session. Focus on wave management and catching farm between fights. Every minion is gold!';
    }
    
    const payload: ScenePayload = {
      sceneId: 'cs',
      vizKind: 'line',
      insight: {
        summary,
        details,
        action,
        metrics: [
          {
            label: 'Total CS',
            value: totalCS.toLocaleString(),
            context: `across ${processedMatches} games`
          },
          {
            label: 'Average CS/Game',
            value: avgCS.toFixed(1),
            context: farmingLevel
          },
          {
            label: 'CS Per Minute',
            value: avgCSPerMin.toFixed(2),
            context: 'average efficiency'
          },
          {
            label: 'Best Performance',
            value: bestCSGame.cs,
            context: `${bestCSGame.csPerMin.toFixed(2)} CS/min`
          }
        ],
        vizData
      }
    };
    
    console.log(`[computeCS] Returning payload for cs`);
    return payload;
    
  } catch (error) {
    console.error('[computeCS] Error:', error);
    
    return {
      sceneId: 'cs',
      vizKind: 'line',
      insight: {
        summary: 'Unable to analyze CS statistics',
        details: [
          'There was an error processing your match data',
          error instanceof Error ? error.message : 'Unknown error'
        ],
        action: 'Please try again later or contact support if the issue persists',
        metrics: [],
        vizData: { chartData: [], type: 'cs_statistics', stats: {} }
      }
    };
  }
}
