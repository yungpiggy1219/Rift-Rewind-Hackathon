import { ScenePayload, MatchParticipant } from '../types';
import { fetchMatchDetailFromCache } from '../riot';

// Type guard to check if participant is a MatchParticipant
function isMatchParticipant(participant: MatchParticipant | { puuid: string; riotIdGameName: string }): participant is MatchParticipant {
  return 'goldEarned' in participant && 'win' in participant;
}

export async function computeMVP(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeMVP] Starting for ${ctx.puuid} - FINDING BEST GAME (MVP)`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeMVP] Using ${matchIds.length} cached match IDs`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Track best game by KDA
    let mvpMatch = {
      championName: '',
      championId: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      kda: 0,
      damage: 0,
      visionScore: 0,
      cs: 0,
      goldEarned: 0,
      win: false,
      items: [] as number[],
      summoner1Id: 4,
      summoner2Id: 4,
      performanceScore: 0,
      matchId: '',
      date: ''
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
        
        // Calculate KDA for this game
        const currentKda = playerParticipant.deaths > 0
          ? (playerParticipant.kills + playerParticipant.assists) / playerParticipant.deaths
          : playerParticipant.kills + playerParticipant.assists;
        
        // Calculate performance score (weighted by KDA + win bonus)
        const winBonus = playerParticipant.win ? 1.5 : 1.0;
        const performanceScore = currentKda * winBonus;
        
        // Check if this is the best game
        if (performanceScore > mvpMatch.performanceScore) {
          mvpMatch = {
            championName: playerParticipant.championName,
            championId: playerParticipant.championId,
            kills: playerParticipant.kills,
            deaths: playerParticipant.deaths,
            assists: playerParticipant.assists,
            kda: currentKda,
            damage: playerParticipant.totalDamageDealtToChampions || 0,
            visionScore: playerParticipant.visionScore || 0,
            cs: playerParticipant.totalMinionsKilled || 0,
            goldEarned: playerParticipant.goldEarned || 0,
            win: playerParticipant.win,
            items: playerParticipant.items || [],
            summoner1Id: playerParticipant.summoner1Id,
            summoner2Id: playerParticipant.summoner2Id,
            performanceScore: performanceScore,
            matchId: match.gameId,
            date: new Date(match.gameCreation).toLocaleDateString()
          };
        }
      }
    }
    
    if (!mvpMatch.championName) {
      // No games found
      return {
        sceneId: 'path_forward',
        vizKind: 'highlight',
        insight: {
          summary: 'No MVP Match Found',
          details: [
            'Unable to find your best performing match',
            'There was an issue analyzing your match history'
          ],
          action: 'Try playing more games to generate MVP data',
          metrics: [],
          vizData: {
            type: 'highlight',
            mvpMatch: null
          }
        }
      };
    }
    
    console.log(`[computeMVP] MVP Match found:`, {
      champion: mvpMatch.championName,
      kda: mvpMatch.kda.toFixed(2),
      kills: mvpMatch.kills,
      deaths: mvpMatch.deaths,
      assists: mvpMatch.assists,
      damage: mvpMatch.damage,
      date: mvpMatch.date
    });
    
    // Build insight summary
    const kdaRating = mvpMatch.kda >= 5 ? 'exceptional' : mvpMatch.kda >= 3 ? 'dominant' : mvpMatch.kda >= 2 ? 'strong' : 'adequate';
    const winStatus = mvpMatch.win ? 'VICTORY' : 'DEFEAT';
    
    const details: string[] = [
      `MVP Match: ${mvpMatch.championName} - ${mvpMatch.date}`,
      `Result: ${winStatus}`,
      `KDA: ${mvpMatch.kills}/${mvpMatch.deaths}/${mvpMatch.assists} (${mvpMatch.kda.toFixed(2)} ratio)`,
      `Damage to Champions: ${(mvpMatch.damage / 1000).toFixed(1)}K`,
      `CS (Minions Killed): ${mvpMatch.cs}`,
      `Gold Earned: ${(mvpMatch.goldEarned / 1000).toFixed(1)}K`,
      `Vision Score: ${mvpMatch.visionScore}`
    ];
    
    const summary = `Your MVP performance was on ${mvpMatch.championName} with an ${kdaRating} KDA of ${mvpMatch.kda.toFixed(2)}. You dealt ${(mvpMatch.damage / 1000).toFixed(1)}K damage and secured ${mvpMatch.kills} kills across the ${winStatus === 'VICTORY' ? 'victorious' : 'challenging'} battle.`;
    
    const action = mvpMatch.kda >= 5
      ? 'Replicate this exceptional performance by focusing on the same playstyle and champion pick!'
      : mvpMatch.kda >= 3
      ? 'Build on this dominant game by analyzing what made it so successful.'
      : 'This was your standout game—analyze key moments to identify what went right.';
    
    const payload: ScenePayload = {
      sceneId: 'path_forward',
      vizKind: 'highlight',
      insight: {
        summary,
        details,
        action,
        metrics: [
          {
            label: 'MVP Champion',
            value: mvpMatch.championName,
            context: kdaRating
          },
          {
            label: 'KDA Ratio',
            value: mvpMatch.kda.toFixed(2),
            context: `${mvpMatch.kills}/${mvpMatch.deaths}/${mvpMatch.assists}`
          },
          {
            label: 'Damage Output',
            value: (mvpMatch.damage / 1000).toFixed(1),
            unit: 'K',
            context: 'to champions'
          },
          {
            label: 'Result',
            value: winStatus,
            context: mvpMatch.date
          }
        ],
        vizData: {
          type: 'highlight',
          mvpMatch: {
            championName: mvpMatch.championName,
            championId: mvpMatch.championId,
            kills: mvpMatch.kills,
            deaths: mvpMatch.deaths,
            assists: mvpMatch.assists,
            kda: mvpMatch.kda,
            damage: mvpMatch.damage,
            visionScore: mvpMatch.visionScore,
            cs: mvpMatch.cs,
            goldEarned: mvpMatch.goldEarned,
            win: mvpMatch.win,
            items: mvpMatch.items,
            summoner1Id: mvpMatch.summoner1Id,
            summoner2Id: mvpMatch.summoner2Id,
            date: mvpMatch.date,
            matchId: mvpMatch.matchId
          }
        }
      }
    };
    
    console.log(`[computeMVP] Returning payload for path_forward`);
    return payload;
    
  } catch (error) {
    console.error('[computeMVP] Error:', error);
    
    return {
      sceneId: 'path_forward',
      vizKind: 'highlight',
      insight: {
        summary: 'Unable to calculate MVP',
        details: [
          'There was an error processing your match data',
          error instanceof Error ? error.message : 'Unknown error'
        ],
        action: 'Please try again later or contact support if the issue persists',
        metrics: [],
        vizData: {
          type: 'highlight',
          mvpMatch: null
        }
      }
    };
  }
}
