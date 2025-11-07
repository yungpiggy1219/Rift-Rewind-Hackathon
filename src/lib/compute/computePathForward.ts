import type { ScenePayload } from '../types';
import { fetchMatchDetail } from '../riot';
import { getChampionName } from '../champions';

/**
 * computePathForward
 * 
 * A closing scene with the MVP match of the year - the best overall performance.
 * Calculates a performance score based on KDA, damage, vision, and win.
 */
export async function computePathForward(
  ctx: { puuid: string; matchIds: string[] }
): Promise<ScenePayload> {
  const { puuid, matchIds } = ctx;
  
  console.log(`[computePathForward] Creating closing scene with MVP match for ${matchIds.length} matches`);

  // Find MVP match - the best overall performance
  interface MVPMatch {
    matchId: string;
    championName: string;
    championId: number;
    kills: number;
    deaths: number;
    assists: number;
    kda: string;
    damage: number;
    visionScore: number;
    cs: number;
    goldEarned: number;
    win: boolean;
    items: number[];
    summoner1Id: number;
    summoner2Id: number;
    performanceScore: string;
  }
  
  let mvpMatch: MVPMatch | null = null;
  let highestScore = -1;

  for (const matchId of matchIds.slice(0, 100)) { // Check up to 100 recent matches
    try {
      const match = await fetchMatchDetail(matchId, puuid);
      if (!match?.participants) continue;

      const participant = match.participants.find(
        (p: { puuid: string }) => p.puuid === puuid
      );
      
      if (!participant || !('kills' in participant)) continue;

      // Calculate performance score
      const kills = participant.kills || 0;
      const deaths = Math.max(participant.deaths || 1, 1);
      const assists = participant.assists || 0;
      const kda = (kills + assists) / deaths;
      
      const damage = participant.totalDamageDealtToChampions || 0;
      const visionScore = participant.visionScore || 0;
      const won = participant.win ? 1 : 0;
      
      // Weighted performance score
      const score = 
        (kda * 10) +                    // KDA weight
        (damage / 1000) +               // Damage weight
        (visionScore * 2) +             // Vision weight
        (won * 50);                     // Win bonus
      
      if (score > highestScore) {
        highestScore = score;
        mvpMatch = {
          matchId,
          championName: getChampionName(participant.championId),
          championId: participant.championId,
          kills,
          deaths,
          assists,
          kda: kda.toFixed(2),
          damage: participant.totalDamageDealtToChampions || 0,
          visionScore,
          cs: (participant.totalMinionsKilled || 0) + (participant.neutralMinionsKilled || 0),
          goldEarned: participant.goldEarned || 0,
          win: participant.win,
          items: participant.items || [],
          summoner1Id: participant.summoner1Id || 0,
          summoner2Id: participant.summoner2Id || 0,
          performanceScore: score.toFixed(1)
        };
      }
    } catch (error) {
      console.error(`[computePathForward] Error processing match ${matchId}:`, error);
    }
  }

  const summary = `What a year it's been! You've played ${matchIds.length} games, created countless memories, and left your mark on the Rift.`;

  const details = [
    '🎮 Thank you for being part of the League of Legends community.',
    '✨ Your journey through 2025 has been remarkable.',
    '🚀 Every game is a new opportunity to grow and improve.',
    '',
    '💪 Keep pushing your limits.',
    '🎯 Keep learning from every match.',
    '🤝 Keep making those plays with your friends.',
    '',
    '🌟 See you on the Rift, Summoner!'
  ];

  const action = 'Here\'s to an even better year ahead! Keep climbing, keep improving, and most importantly - keep having fun!';

  const payload: ScenePayload = {
    sceneId: 'path_forward',
    vizKind: 'highlight',
    insight: {
      summary,
      details,
      action,
      metrics: [
        {
          label: 'Total Games',
          value: matchIds.length,
          context: 'in 2025'
        },
        {
          label: 'Your Journey',
          value: '🌟',
          context: 'Continues...'
        }
      ],
      vizData: {
        type: 'highlight',
        mainStat: {
          label: '2025 Complete',
          value: '🎉',
          icon: '✨'
        },
        stats: [
          {
            label: 'Games Played',
            value: matchIds.length.toString()
          },
          {
            label: 'Status',
            value: 'Champion'
          },
          {
            label: 'Next Stop',
            value: '2026 →'
          }
        ],
        mvpMatch // Add MVP match data
      }
    }
  };

  console.log(`[computePathForward] MVP Match: ${mvpMatch?.championName} with score ${mvpMatch?.performanceScore}`);
  return payload;
}
