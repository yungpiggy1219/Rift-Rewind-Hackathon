import { ScenePayload } from '../types';
import { fetchRankedStats } from '../riot';

export async function computeRanked(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeRanked] Starting for ${ctx.puuid} - ANALYZING RANKED PERFORMANCE`);
  
  try {
    const rankedStats = await fetchRankedStats(ctx.puuid);
    
    if (!rankedStats || (!rankedStats.soloQueue && !rankedStats.flexQueue)) {
      return {
        sceneId: 'ranked_stats',
        vizKind: 'ranked',
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
            soloQueue: null,
            flexQueue: null
          }
        }
      };
    }
    
    console.log(`[computeRanked] Using ${ctx.matchIds.length} cached match IDs`);
    
    let soloQueueData = null;
    if (rankedStats.soloQueue) {
      const { tier, rank, leaguePoints, wins, losses } = rankedStats.soloQueue;
      const totalGames = wins + losses;
      const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';
      
      soloQueueData = {
        tier,
        rankDivision: rank,
        lp: leaguePoints,
        wins,
        losses,
        winRate: parseFloat(winRate),
        totalGames
      };
    }
    
    let flexQueueData = null;
    if (rankedStats.flexQueue) {
      const { tier, rank, leaguePoints, wins, losses } = rankedStats.flexQueue;
      const totalGames = wins + losses;
      const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';
      
      flexQueueData = {
        tier,
        rankDivision: rank,
        lp: leaguePoints,
        wins,
        losses,
        winRate: parseFloat(winRate),
        totalGames
      };
    }
    
    const primaryQueue = soloQueueData || flexQueueData;
    const primaryQueueType = soloQueueData ? 'Solo/Duo' : 'Flex';
    
    let summary = '';
    const details: string[] = [];
    let action = '';
    
    if (primaryQueue) {
      const rankDisplayName = `${primaryQueue.tier.charAt(0)}${primaryQueue.tier.slice(1).toLowerCase()} ${primaryQueue.rankDivision}`;
      
      summary = `You're ${rankDisplayName} in ${primaryQueueType} with ${primaryQueue.lp} LP. `;
      summary += `Your ${primaryQueue.wins}-${primaryQueue.losses} record shows ${primaryQueue.winRate}% win rate.`;
      
      details.push(`${primaryQueueType} Rank: ${rankDisplayName}`);
      details.push(`League Points: ${primaryQueue.lp} LP`);
      details.push(`Record: ${primaryQueue.wins}W - ${primaryQueue.losses}L (${primaryQueue.winRate}% win rate)`);
      details.push(`Total Games: ${primaryQueue.totalGames}`);
      
      if (soloQueueData && flexQueueData) {
        const flexRankName = `${flexQueueData.tier.charAt(0)}${flexQueueData.tier.slice(1).toLowerCase()} ${flexQueueData.rankDivision}`;
        details.push('');
        details.push(`Flex Queue: ${flexRankName} (${flexQueueData.lp} LP)`);
        details.push(`Flex Record: ${flexQueueData.wins}W - ${flexQueueData.losses}L (${flexQueueData.winRate}% WR)`);
      }
      
      action = primaryQueue.winRate >= 50
        ? 'Keep climbing! Your win rate shows you belong at this elo or higher.'
        : 'Focus on improving fundamentals to boost your win rate and climb the ladder.';
    }
    
    const payload: ScenePayload = {
      sceneId: 'ranked_stats',
      vizKind: 'ranked',
      insight: {
        summary,
        details,
        action,
        metrics: soloQueueData ? [
          {
            label: 'Solo/Duo Rank',
            value: `${soloQueueData.tier} ${soloQueueData.rankDivision}`,
            context: `${soloQueueData.lp} LP`
          },
          {
            label: 'Win Rate',
            value: soloQueueData.winRate.toFixed(1),
            unit: '%',
            context: `${soloQueueData.wins}W-${soloQueueData.losses}L`
          }
        ] : [],
        vizData: {
          soloQueue: soloQueueData,
          flexQueue: flexQueueData
        }
      }
    };
    
    console.log('[computeRanked] Returning payload for ranked_stats');
    return payload;
    
  } catch (error) {
    console.error('[computeRanked] Error:', error);
    
    return {
      sceneId: 'ranked_stats',
      vizKind: 'ranked',
      insight: {
        summary: 'Unable to load ranked statistics',
        details: [
          'There was an error fetching your ranked data',
          error instanceof Error ? error.message : 'Unknown error'
        ],
        action: 'Please try again later or contact support if the issue persists',
        metrics: [],
        vizData: {
          soloQueue: null,
          flexQueue: null
        }
      }
    };
  }
}
