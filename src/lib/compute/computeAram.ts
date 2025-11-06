import { ScenePayload, MatchParticipant } from '../types';
import { fetchMatchDetailFromCache } from '../riot';

// Type guard to check if participant is a MatchParticipant
function isMatchParticipant(participant: MatchParticipant | { puuid: string; riotIdGameName: string }): participant is MatchParticipant {
  return 'goldEarned' in participant && 'win' in participant;
}

export async function computeARAM(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeARAM] Starting for ${ctx.puuid} - ANALYZING ARAM GAMES`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeARAM] Using ${matchIds.length} cached match IDs`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Track ARAM statistics
    let aramMatches = 0;
    let aramWins = 0;
    let totalAramTime = 0; // in seconds
    let totalDamageToChampions = 0;
    let totalTimeSpentDead = 0;
    let totalDeaths = 0;
    let totalKills = 0;
    let totalAssists = 0;
    
    // Track champion usage in ARAM
    const championUsage = new Map<string, number>();
    
    // Track best ARAM game
    let bestAramGame = {
      kills: 0,
      deaths: 0,
      assists: 0,
      damage: 0,
      championName: '',
      date: '',
      matchId: ''
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
        
        // Check if this is an ARAM game
        if (match.gameMode !== 'ARAM') continue;
        
        // Find the player's participant data
        const playerParticipant = match.participants.find((p) => p.puuid === ctx.puuid);
        
        if (!playerParticipant || !isMatchParticipant(playerParticipant)) {
          continue;
        }
        
        aramMatches++;
        
        // Track wins
        if (playerParticipant.win) {
          aramWins++;
        }
        
        // Track time
        totalAramTime += match.gameDuration;
        
        // Track damage
        const damageDealt = playerParticipant.totalDamageDealtToChampions || 0;
        totalDamageToChampions += damageDealt;
        
        // Track deaths and estimate time spent dead
        totalDeaths += playerParticipant.deaths;
        totalKills += playerParticipant.kills;
        totalAssists += playerParticipant.assists;
        
        const gameTimeMinutes = match.gameDuration / 60;
        if (playerParticipant.timeSpentDead) {
          totalTimeSpentDead += playerParticipant.timeSpentDead;
        } else {
          // Estimate time spent dead (ARAM has faster death timers)
          const avgDeathTimer = Math.min(10 + (gameTimeMinutes * 1.2), 50); // Faster respawns in ARAM
          const estimatedDeadTime = playerParticipant.deaths * avgDeathTimer;
          totalTimeSpentDead += estimatedDeadTime / 60; // Convert to minutes
        }
        
        // Track champion usage
        const currentCount = championUsage.get(playerParticipant.championName) || 0;
        championUsage.set(playerParticipant.championName, currentCount + 1);
        
        // Check if this is the best game
        const kda = playerParticipant.deaths > 0 
          ? (playerParticipant.kills + playerParticipant.assists) / playerParticipant.deaths 
          : playerParticipant.kills + playerParticipant.assists;
        const bestKda = bestAramGame.deaths > 0 
          ? (bestAramGame.kills + bestAramGame.assists) / bestAramGame.deaths 
          : bestAramGame.kills + bestAramGame.assists;
        
        if (damageDealt > bestAramGame.damage || kda > bestKda) {
          bestAramGame = {
            kills: playerParticipant.kills,
            deaths: playerParticipant.deaths,
            assists: playerParticipant.assists,
            damage: damageDealt,
            championName: playerParticipant.championName,
            date: new Date(match.gameCreation).toLocaleDateString(),
            matchId: match.gameId
          };
        }
      }
    }
    
    if (aramMatches === 0) {
      // No ARAM games found
      return {
        sceneId: 'aram',
        vizKind: 'infographic',
        insight: {
          summary: 'No ARAM Adventures This Year',
          details: [
            'No ARAM games detected in your match history',
            'ARAM (All Random All Mid) is a fast-paced game mode on the Howling Abyss',
            'It\'s a great way to try new champions and have chaotic fun!'
          ],
          action: 'Try out ARAM for a more casual, action-packed League experience!',
          metrics: [
            {
              label: 'ARAM Games',
              value: 0,
              context: 'Time to try it!'
            }
          ],
          vizData: {
            type: 'infographic',
            stats: {}
          }
        }
      };
    }
    
    // Calculate statistics
    const winRate = (aramWins / aramMatches) * 100;
    const avgDamage = totalDamageToChampions / aramMatches;
    const totalAramHours = totalAramTime / 3600;
    const avgTimeSpentDead = totalTimeSpentDead / aramMatches;
    const avgKills = totalKills / aramMatches;
    const avgDeaths = totalDeaths / aramMatches;
    const avgAssists = totalAssists / aramMatches;
    const avgKDA = avgDeaths > 0 ? (avgKills + avgAssists) / avgDeaths : avgKills + avgAssists;
    
    // Get most played ARAM champion
    const sortedChampions = Array.from(championUsage.entries()).sort((a, b) => b[1] - a[1]);
    const favoriteAramChampion = sortedChampions[0]?.[0] || 'Unknown';
    const favoriteChampionGames = sortedChampions[0]?.[1] || 0;
    
    console.log(`[computeARAM] Analysis complete:`, {
      aramMatches,
      winRate: winRate.toFixed(1),
      totalHours: totalAramHours.toFixed(1),
      avgDamage: avgDamage.toFixed(0),
      favoriteChampion: favoriteAramChampion
    });
    
    // Build visualization data
    const vizData = {
      type: 'infographic',
      stats: {
        totalGames: aramMatches,
        winRate: `${winRate.toFixed(1)}%`,
        timeSpent: `${totalAramHours.toFixed(1)}h`,
        avgDamage: avgDamage >= 1000000 
          ? `${(avgDamage / 1000000).toFixed(1)}M` 
          : `${(avgDamage / 1000).toFixed(0)}K`,
        avgKDA: avgKDA.toFixed(2),
        fountainTime: `${avgTimeSpentDead.toFixed(1)}m`,
        favoriteChamp: favoriteAramChampion,
        bestGame: `${bestAramGame.kills}/${bestAramGame.deaths}/${bestAramGame.assists}`
      }
    };
    
    // Build insight summary
    const aramCommitment = aramMatches >= 100 ? 'ARAM enthusiast' : aramMatches >= 50 ? 'frequent ARAM player' : aramMatches >= 20 ? 'casual ARAM enjoyer' : 'ARAM dabbler';
    const performanceLevel = winRate >= 55 ? 'dominating' : winRate >= 50 ? 'holding strong' : winRate >= 45 ? 'battling' : 'struggling';
    
    const details: string[] = [
      `Played ${aramMatches} ARAM games this year`,
      `Total time on the Howling Abyss: ${totalAramHours.toFixed(1)} hours`,
      `Win rate: ${winRate.toFixed(1)}% (${aramWins}W-${aramMatches - aramWins}L)`,
      `Average damage to champions: ${avgDamage.toLocaleString()} per game`,
      `Average KDA: ${avgKills.toFixed(1)}/${avgDeaths.toFixed(1)}/${avgAssists.toFixed(1)} (${avgKDA.toFixed(2)} ratio)`,
      `Time spent dead: ${avgTimeSpentDead.toFixed(1)} minutes per game`,
      `Favorite ARAM champion: ${favoriteAramChampion} (${favoriteChampionGames} games)`,
      `Best game: ${bestAramGame.kills}/${bestAramGame.deaths}/${bestAramGame.assists} on ${bestAramGame.championName} (${bestAramGame.date})`
    ];
    
    // Add champion variety info
    if (sortedChampions.length > 1) {
      details.push('');
      details.push('Top ARAM champions:');
      sortedChampions.slice(0, 5).forEach((entry, idx) => {
        details.push(`${idx + 1}. ${entry[0]} - ${entry[1]} games`);
      });
    }
    
    const summary = `You're a ${aramCommitment}! With ${aramMatches} ARAM games under your belt, you've spent ${totalAramHours.toFixed(1)} hours on the Howling Abyss. You're ${performanceLevel} with a ${winRate.toFixed(1)}% win rate, averaging ${(avgDamage / 1000).toFixed(0)}K damage per game. ${favoriteAramChampion} is your go-to pick!`;
    
    let action = '';
    if (winRate >= 55) {
      action = 'You\'re crushing it in ARAM! Keep that momentum going and consider trying new champion builds for even more fun.';
    } else if (winRate >= 45) {
      action = 'Solid ARAM performance! Focus on positioning in teamfights and looking for high-impact moments to swing games.';
    } else {
      action = 'ARAM is all about fun and learning! Try focusing on dying less and landing key abilities in the constant teamfights.';
    }
    
    if (aramMatches < 20) {
      action += ' Play more ARAM to build a stronger sample of your chaotic gameplay!';
    }
    
    const payload: ScenePayload = {
      sceneId: 'aram',
      vizKind: 'infographic',
      insight: {
        summary,
        details,
        action,
        metrics: [
          {
            label: 'ARAM Games',
            value: aramMatches,
            context: aramCommitment
          },
          {
            label: 'Win Rate',
            value: winRate.toFixed(1),
            unit: '%',
            context: performanceLevel
          },
          {
            label: 'Total Time',
            value: totalAramHours.toFixed(1),
            unit: 'hours',
            context: 'on Howling Abyss'
          },
          {
            label: 'Avg Damage',
            value: (avgDamage / 1000).toFixed(0),
            unit: 'K',
            context: 'to champions per game'
          },
          {
            label: 'Champion Pool',
            value: sortedChampions.length,
            context: `${favoriteAramChampion} most played`
          }
        ],
        vizData
      }
    };
    
    console.log(`[computeARAM] Returning payload for aram`);
    return payload;
    
  } catch (error) {
    console.error('[computeARAM] Error:', error);
    
    return {
      sceneId: 'aram',
      vizKind: 'infographic',
      insight: {
        summary: 'Unable to analyze ARAM games',
        details: [
          'There was an error processing your match data',
          error instanceof Error ? error.message : 'Unknown error'
        ],
        action: 'Please try again later or contact support if the issue persists',
        metrics: [],
        vizData: {
          type: 'infographic',
          stats: {}
        }
      }
    };
  }
}
