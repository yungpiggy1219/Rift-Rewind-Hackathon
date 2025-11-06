import type { ScenePayload, MatchParticipant } from '../types';
import { fetchMatchDetailFromCache } from '../riot';

// Type guard for MatchParticipant
function isMatchParticipant(participant: MatchParticipant | { puuid: string; riotIdGameName: string }): participant is MatchParticipant {
  return 'goldEarned' in participant && 'win' in participant;
}

/**
 * computeFancyFeet
 * 
 * Tracks skillshots dodged across the year.
 * Calculates total dodges, average per game, and identifies best performances.
 * 
 * Returns a highlight visualization with dodge statistics and rating.
 */
export async function computeFancyFeet(
  ctx: { puuid: string; matchIds: string[] }
): Promise<ScenePayload> {
  const { puuid, matchIds } = ctx;
  console.log(`[computeFancyFeet] Analyzing ${matchIds.length} matches for ${puuid}`);

  let totalSkillshotsDodged = 0;
  let gamesWithDodgeData = 0;
  let bestDodgeGame: { matchId: string; dodges: number; champion: string; date: Date } | null = null;

  // Fetch and process matches
  for (const matchId of matchIds) {
    try {
      const match = await fetchMatchDetailFromCache(matchId);
      if (!match || typeof match !== 'object') continue;

      const matchData = match as any;
      const { metadata, info, participants } = matchData;

      if (!matchData?.matchId || !participants || !Array.isArray(participants)) {
        continue;
      }

      // Find the participant for this puuid
      const participant = participants.find((p: any) => p?.puuid === puuid);
      if (!participant || !isMatchParticipant(participant)) continue;

      // Extract dodge data (if available - not all matches/champions track this)
      const dodges = participant.skillshotsDodged ?? 0;
      
      if (dodges > 0 || participant.skillshotsDodged !== undefined) {
        gamesWithDodgeData++;
        totalSkillshotsDodged += dodges;

        // Track best dodge game
        if (!bestDodgeGame || dodges > bestDodgeGame.dodges) {
          bestDodgeGame = {
            matchId: matchData.matchId,
            dodges,
            champion: participant.championName ?? 'Unknown',
            date: new Date(matchData.gameCreation ?? Date.now())
          };
        }
      }
    } catch (error) {
      console.error(`[computeFancyFeet] Error processing match ${matchId}:`, error);
    }
  }

  console.log(`[computeFancyFeet] Processed ${matchIds.length} matches`);
  console.log(`[computeFancyFeet] Games with dodge data: ${gamesWithDodgeData}`);
  console.log(`[computeFancyFeet] Total skillshots dodged: ${totalSkillshotsDodged}`);

  // Calculate averages
  const avgDodgesPerGame = gamesWithDodgeData > 0 
    ? totalSkillshotsDodged / gamesWithDodgeData 
    : 0;

  // Determine rating based on average dodges
  let rating: string;
  let emoji: string;

  if (avgDodgesPerGame >= 45) {
    rating = 'Untouchable';
    emoji = '👻';
  } else if (avgDodgesPerGame >= 30) {
    rating = 'Matrix Dodger';
    emoji = '🕴️';
  } else if (avgDodgesPerGame >= 20) {
    rating = 'Nimble Dancer';
    emoji = '💃';
  } else if (avgDodgesPerGame >= 12) {
    rating = 'Quick Reflexes';
    emoji = '⚡';
  } else if (avgDodgesPerGame >= 5) {
    rating = 'Evasive';
    emoji = '🏃';
  } else {
    rating = 'Developing';
    emoji = '🎯';
  }

  // Build detailed insights
  const details: string[] = [];

  if (gamesWithDodgeData === 0) {
    details.push('⚠️ No dodge data available for your matches this year.');
    details.push('📊 Skillshot dodge tracking may not be available for all champions or game modes.');
  } else {
    details.push(`${emoji} ${rating}`);
    details.push(`📊 Average: ${avgDodgesPerGame.toFixed(1)} skillshots dodged per game`);
    details.push(`🎮 Data tracked across ${gamesWithDodgeData} games (${((gamesWithDodgeData / matchIds.length) * 100).toFixed(0)}% of matches)`);
    details.push('');

    if (bestDodgeGame) {
      details.push('🏆 Best Performance:');
      details.push(`  ${bestDodgeGame.champion} (${bestDodgeGame.date.toLocaleDateString()})`);
      details.push(`  ${bestDodgeGame.dodges} skillshots dodged`);
      details.push('');
    }

    // Contextual advice
    if (avgDodgesPerGame >= 30) {
      details.push('� Your movement is exceptional! Consider playing champions that benefit from kiting.');
    } else if (avgDodgesPerGame >= 15) {
      details.push('🎯 Good dodging! Practice predicting enemy skillshots for even better results.');
    } else if (avgDodgesPerGame >= 5) {
      details.push('✨ Work on your positioning and watch for enemy ability animations.');
    } else {
      details.push('🌱 Tip: Use your champion\'s mobility spells to dodge high-impact skillshots!');
      details.push('�️ Watch the minimap to predict enemy ganks and position safely.');
    }
  }

  // Build summary and action
  let summary = '';
  let action = '';

  if (gamesWithDodgeData === 0) {
    summary = 'No dodge data available for your matches. This stat may not be tracked for all champions or game modes.';
    action = 'Play mobile champions and focus on positioning to improve your dodging skills!';
  } else if (avgDodgesPerGame >= 30) {
    summary = `${emoji} ${rating}! You've dodged ${totalSkillshotsDodged} skillshots across ${matchIds.length} games, averaging ${avgDodgesPerGame.toFixed(1)} per game. Your best performance was ${bestDodgeGame?.dodges ?? 0} dodges on ${bestDodgeGame?.champion ?? 'Unknown'}! You move like water, impossible to hit!`;
    action = 'Your evasion is already elite! Keep using your movement advantage to control fights.';
  } else if (avgDodgesPerGame >= 15) {
    summary = `${emoji} ${rating}! With ${totalSkillshotsDodged} skillshots dodged (${avgDodgesPerGame.toFixed(1)} per game), you're showing strong positioning. Your peak was ${bestDodgeGame?.dodges ?? 0} dodges on ${bestDodgeGame?.champion ?? 'Unknown'}.`;
    action = 'Great evasion! Focus on: 1) Predicting enemy cast animations, 2) Using terrain and fog of war, 3) Maintaining unpredictable movement.';
  } else if (avgDodgesPerGame >= 5) {
    summary = `${emoji} ${rating}. You've dodged ${totalSkillshotsDodged} skillshots across ${matchIds.length} games (${avgDodgesPerGame.toFixed(1)} average). Your best game was ${bestDodgeGame?.dodges ?? 0} dodges on ${bestDodgeGame?.champion ?? 'Unknown'}.`;
    action = 'Improve evasion by: 1) Moving unpredictably in lane, 2) Respecting enemy cooldowns, 3) Positioning behind minions vs poke.';
  } else {
    summary = `${emoji} ${rating}. With ${totalSkillshotsDodged} skillshots dodged (${avgDodgesPerGame.toFixed(1)} per game), there's room to improve. ${gamesWithDodgeData < matchIds.length ? 'Limited data available for some matches.' : ''}`;
    action = 'Priority: 1) Practice sidestep timing, 2) Study enemy ability ranges, 3) Watch high-elo players to learn movement patterns.';
  }

  // Prepare viz data
  const vizData = {
    type: 'highlight',
    mainStat: {
      label: 'Avg Skillshots Dodged',
      value: avgDodgesPerGame.toFixed(1),
      icon: emoji
    },
    stats: [
      {
        label: 'Total Dodged',
        value: totalSkillshotsDodged.toString()
      },
      {
        label: 'Games Tracked',
        value: gamesWithDodgeData.toString()
      },
      {
        label: 'Best Game',
        value: bestDodgeGame?.dodges.toString() ?? '0'
      }
    ]
  };

  // Return scene payload
  const payload: ScenePayload = {
    sceneId: 'fancy_feet',
    vizKind: 'highlight',
    insight: {
      summary,
      details,
      action,
      metrics: [
        {
          label: 'Total Dodged',
          value: totalSkillshotsDodged,
          context: rating
        },
        {
          label: 'Average Per Game',
          value: avgDodgesPerGame.toFixed(1),
          unit: 'dodges',
          context: `across ${matchIds.length} games`
        },
        {
          label: 'Best Game',
          value: bestDodgeGame?.dodges ?? 0,
          unit: 'dodges',
          context: bestDodgeGame?.champion ?? 'N/A'
        },
        {
          label: 'Data Coverage',
          value: gamesWithDodgeData,
          context: `of ${matchIds.length} games`
        }
      ],
      vizData
    }
  };

  console.log(`[computeFancyFeet] Returning payload for fancy_feet`);
  return payload;
}
