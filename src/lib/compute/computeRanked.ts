import { ScenePayload, MatchParticipant } from '../types';
import { fetchMatchDetailFromCache, fetchRankedStats } from '../riot';

// Type guard to check if participant is a MatchParticipant
function isMatchParticipant(participant: MatchParticipant | { puuid: string; riotIdGameName: string }): participant is MatchParticipant {
  return 'goldEarned' in participant && 'win' in participant;
}

export async function computeRanked(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeRanked] Starting for ${ctx.puuid} - ANALYZING RANKED PERFORMANCE`);
  
  try {
    // Fetch current ranked stats from Riot API
    const rankedStats = await fetchRankedStats(ctx.puuid);
    
    if (!rankedStats) {
      // Player is unranked or no ranked data available
      return {
        sceneId: 'ranked_stats',
        vizKind: 'highlight',
        insight: {
          summary: 'The Unranked Journey',
          details: [
            'No ranked games detected this season',
            'Jump into Ranked Solo/Duo to place on the ladder!',
            'Start your competitive journey and see how you stack up'
          ],
          action: 'Play your placement matches to get ranked and track your climb!',
          metrics: [
            {
              label: 'Rank',
              value: 'Unranked',
              context: 'Ready to climb?'
            }
          ],
          vizData: {
            rank: 'Unranked',
            tier: '',
            lp: 0,
            wins: 0,
            losses: 0
          }
        }
      };
    }
    
    const matchIds = ctx.matchIds || [];
    console.log(`[computeRanked] Using ${matchIds.length} cached match IDs`);
    
    // Track recent ranked match performance
    let recentMatchesWon = 0;
    let recentMatchesTotal = 0;
    const recentMatchLimit = 10; // Track last 10 ranked games
    
    // LP estimation (rough calculation)
    const { tier, rank, leaguePoints, wins, losses } = rankedStats;
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
    
    // Analyze recent ranked matches from match history
    const batchSize = 10;
    
    for (let i = 0; i < Math.min(matchIds.length, 100); i += batchSize) {
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
        
        // Check if this is a ranked solo/duo game (queue ID 420)
        // For now, we'll just count wins/losses from ranked stats
        const playerParticipant = match.participants.find((p) => p.puuid === ctx.puuid);
        
        if (!playerParticipant || !isMatchParticipant(playerParticipant)) {
          continue;
        }
        
        // Track recent ranked performance
        if (recentMatchesTotal < recentMatchLimit) {
          recentMatchesTotal++;
          if (playerParticipant.win) {
            recentMatchesWon++;
          }
        }
      }
    }
    
    // Calculate LP per game (estimated average)
    const avgLPPerWin = totalGames > 0 ? 18 : 20; // Rough estimate
    const avgLPPerLoss = totalGames > 0 ? -15 : -20;
    
    // Calculate how close to next rank/tier
    const rankOrder = ['IV', 'III', 'II', 'I'];
    const tierOrder = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
    
    const currentRankIndex = rankOrder.indexOf(rank);
    const currentTierIndex = tierOrder.indexOf(tier);
    
    let lpToNextMilestone = 0;
    let nextMilestone = '';
    
    if (tier === 'MASTER' || tier === 'GRANDMASTER' || tier === 'CHALLENGER') {
      // High elo - different system
      lpToNextMilestone = 100 - leaguePoints;
      nextMilestone = tier === 'MASTER' ? 'Grandmaster' : tier === 'GRANDMASTER' ? 'Challenger' : 'Top of Challenger';
    } else if (currentRankIndex === 0 && rank === 'I') {
      // At division I, next is promotion to next tier
      lpToNextMilestone = 100 - leaguePoints;
      nextMilestone = currentTierIndex < tierOrder.length - 1 ? tierOrder[currentTierIndex + 1] : 'Top Tier';
    } else if (currentRankIndex >= 0) {
      // Moving up within tier
      lpToNextMilestone = 100 - leaguePoints;
      nextMilestone = `${tier} ${rankOrder[currentRankIndex - 1]}`;
    } else {
      lpToNextMilestone = 100 - leaguePoints;
      nextMilestone = 'Next Division';
    }
    
    // Calculate games needed (optimistic estimate)
    const netLPPerWin = avgLPPerWin * (winRate / 100) + avgLPPerLoss * (1 - winRate / 100);
    const gamesNeeded = netLPPerWin > 0 ? Math.ceil(lpToNextMilestone / netLPPerWin) : 999;
    
    // Recent form
    const recentWinRate = recentMatchesTotal > 0 ? (recentMatchesWon / recentMatchesTotal) * 100 : winRate;
    const formStatus = recentWinRate >= 60 ? 'hot streak' : recentWinRate >= 50 ? 'steady' : 'slump';
    
    console.log(`[computeRanked] Analysis complete:`, {
      rank: `${tier} ${rank}`,
      lp: leaguePoints,
      wins,
      losses,
      winRate: winRate.toFixed(1),
      lpToNext: lpToNextMilestone,
      gamesNeeded
    });
    
    // Build visualization data
    const vizData = {
      rank: `${tier} ${rank}`,
      tier,
      rankDivision: rank,
      lp: leaguePoints,
      wins,
      losses,
      winRate: winRate.toFixed(1),
      lpToNext: lpToNextMilestone,
      nextMilestone,
      totalGames,
      recentForm: formStatus
    };
    
    // Build insight summary
    const rankDisplayName = `${tier.charAt(0)}${tier.slice(1).toLowerCase()} ${rank}`;
    const performanceLevel = winRate >= 55 ? 'climbing strong' : winRate >= 50 ? 'holding your ground' : winRate >= 45 ? 'fighting to stay even' : 'struggling to maintain';
    
    const details: string[] = [
      `Current Rank: ${rankDisplayName}`,
      `League Points: ${leaguePoints} LP`,
      `Ranked Record: ${wins}W - ${losses}L (${winRate.toFixed(1)}% win rate)`,
      `Total Ranked Games: ${totalGames}`,
      `LP to ${nextMilestone}: ${lpToNextMilestone} LP`,
      `Games needed (estimated): ${gamesNeeded > 100 ? '100+' : gamesNeeded} at current win rate`
    ];
    
    if (recentMatchesTotal > 0) {
      details.push('');
      details.push(`Recent Form (last ${recentMatchesTotal} games):`);
      details.push(`${recentMatchesWon}W - ${recentMatchesTotal - recentMatchesWon}L (${recentWinRate.toFixed(1)}% win rate) - ${formStatus}`);
    }
    
    // Add contextual analysis
    details.push('');
    
    if (winRate >= 55) {
      details.push('🔥 Strong win rate! You\'re climbing efficiently.');
    } else if (winRate >= 50) {
      details.push('⚡ Decent win rate - keep grinding to climb.');
    } else if (winRate >= 45) {
      details.push('⚠️ Below 50% - focus on improving to climb faster.');
    } else {
      details.push('💡 Sub-45% win rate - consider analyzing VODs or getting coaching.');
    }
    
    // LP efficiency
    if (totalGames < 50) {
      details.push('🌱 Early in the season - plenty of time to climb!');
    } else if (totalGames < 100) {
      details.push('📈 Solid game volume - your rank is stabilizing.');
    } else {
      details.push('💪 High game volume - you\'re a grinder!');
    }
    
    let summary = '';
    let action = '';
    
    if (tier === 'CHALLENGER' || tier === 'GRANDMASTER' || tier === 'MASTER') {
      summary = `Elite tier reached! You're at ${rankDisplayName} with ${leaguePoints} LP, competing among the best players. Your ${wins}-${losses} record (${winRate.toFixed(1)}% WR) shows you belong at the top.`;
      action = 'Keep grinding to maintain your high elo status. Every game matters at this level!';
    } else if (tier === 'DIAMOND') {
      summary = `You've reached ${rankDisplayName} with ${leaguePoints} LP! You're ${performanceLevel} with a ${winRate.toFixed(1)}% win rate (${wins}W-${losses}L). Just ${lpToNextMilestone} LP away from ${nextMilestone}!`;
      action = winRate >= 52 
        ? `You're ${gamesNeeded} games away from ${nextMilestone}. Keep up the strong play!`
        : 'Focus on consistency to push through Diamond. Review your losses for patterns.';
    } else if (currentTierIndex >= tierOrder.indexOf('PLATINUM')) {
      summary = `You're ${rankDisplayName} with ${leaguePoints} LP, ${performanceLevel}. Your ${wins}-${losses} record shows ${winRate.toFixed(1)}% win rate. You need ${lpToNextMilestone} LP to reach ${nextMilestone}.`;
      action = winRate >= 50
        ? `Estimated ${gamesNeeded} games to ${nextMilestone} at your current pace. Stay focused!`
        : 'Work on improving your win rate. Small changes can make a big difference!';
    } else {
      summary = `You're ${rankDisplayName} with ${leaguePoints} LP. With a ${winRate.toFixed(1)}% win rate (${wins}W-${losses}L), you're ${performanceLevel}. Just ${lpToNextMilestone} LP from ${nextMilestone}!`;
      action = totalGames < 50
        ? 'Keep playing consistently to establish your true rank. You have room to climb!'
        : winRate >= 50
          ? `You're on track! About ${gamesNeeded} more wins needed to reach ${nextMilestone}.`
          : 'Focus on fundamentals: CS, vision, and smart deaths to boost your win rate.';
    }
    
    // Add recent form context
    if (formStatus === 'hot streak' && recentWinRate > winRate + 10) {
      summary += ` You're on a ${formStatus} recently (${recentWinRate.toFixed(0)}% in last ${recentMatchesTotal} games)!`;
    } else if (formStatus === 'slump' && recentWinRate < winRate - 10) {
      summary += ` Watch out - you're in a ${formStatus} (${recentWinRate.toFixed(0)}% in last ${recentMatchesTotal} games).`;
    }
    
    const payload: ScenePayload = {
      sceneId: 'ranked_stats',
      vizKind: 'highlight',
      insight: {
        summary,
        details,
        action,
        metrics: [
          {
            label: 'Current Rank',
            value: rankDisplayName,
            context: `${leaguePoints} LP`
          },
          {
            label: 'Win Rate',
            value: winRate.toFixed(1),
            unit: '%',
            context: `${wins}W-${losses}L`
          },
          {
            label: 'LP to Promote',
            value: lpToNextMilestone,
            unit: 'LP',
            context: nextMilestone
          },
          {
            label: 'Games Played',
            value: totalGames,
            context: formStatus
          },
          {
            label: 'Est. Games to Promote',
            value: gamesNeeded > 100 ? '100+' : gamesNeeded,
            context: `at ${winRate.toFixed(0)}% WR`
          }
        ],
        vizData
      }
    };
    
    console.log(`[computeRanked] Returning payload for ranked_stats`);
    return payload;
    
  } catch (error) {
    console.error('[computeRanked] Error:', error);
    
    return {
      sceneId: 'ranked_stats',
      vizKind: 'highlight',
      insight: {
        summary: 'Unable to load ranked statistics',
        details: [
          'There was an error fetching your ranked data',
          error instanceof Error ? error.message : 'Unknown error'
        ],
        action: 'Please try again later or contact support if the issue persists',
        metrics: [],
        vizData: {
          rank: 'Error',
          tier: '',
          lp: 0,
          wins: 0,
          losses: 0
        }
      }
    };
  }
}
