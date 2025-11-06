import type { ScenePayload } from '../types';

/**
 * computePathForward
 * 
 * A simple closing scene for the year-end recap.
 * No complex analysis - just a celebratory message thanking the player
 * for their journey through the year. The narration will provide the final words.
 */
export async function computePathForward(
  ctx: { puuid: string; matchIds: string[] }
): Promise<ScenePayload> {
  const { matchIds } = ctx;
  
  console.log(`[computePathForward] Creating closing scene for ${matchIds.length} matches`);

  const summary = `What a year it's been! You've played ${matchIds.length} games, created countless memories, and left your mark on the Rift. Every victory, every defeat, every play - they all tell your unique story.`;

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
        ]
      }
    }
  };

  console.log(`[computePathForward] Returning closing scene payload`);
  return payload;
}
