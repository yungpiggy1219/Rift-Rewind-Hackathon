import { ScenePayload, MatchParticipant } from '../types';
import { fetchMatchDetailFromCache } from '../riot';

// Type guard to check if participant is a MatchParticipant
function isMatchParticipant(participant: MatchParticipant | { puuid: string; riotIdGameName: string }): participant is MatchParticipant {
  return 'goldEarned' in participant && 'win' in participant;
}

export async function computeKillingSpree(ctx: { puuid: string; matchIds: string[] }): Promise<ScenePayload> {
  console.log(`[computeKillingSpree] Starting for ${ctx.puuid} - ANALYZING KILLING SPREES`);
  
  try {
    const matchIds = ctx.matchIds || [];
    console.log(`[computeKillingSpree] Using ${matchIds.length} cached match IDs`);
    
    if (matchIds.length === 0) {
      throw new Error('No matches found');
    }
    
    // Track multikill statistics
    let totalPentaKills = 0;
    let totalQuadraKills = 0;
    let totalTripleKills = 0;
    let totalDoubleKills = 0;
    let longestKillingSpree = 0;
    let processedMatches = 0;
    
    // Track best penta game
    let bestPentaGame = {
      pentaKills: 0,
      matchId: '',
      date: '',
      championName: '',
      kills: 0,
      deaths: 0,
      assists: 0
    };
    
    // Track longest spree game
    let longestSpreeGame = {
      spree: 0,
      matchId: '',
      date: '',
      championName: '',
      kills: 0
    };
    
    // Track matches with multikills
    const pentaMatches: Array<{ date: string; champion: string; count: number }> = [];
    const quadraMatches: Array<{ date: string; champion: string; count: number }> = [];
    
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
        
        const gameDate = new Date(match.gameCreation).toLocaleDateString();
        
        // Track multikills
        const pentaKills = playerParticipant.pentaKills || 0;
        const quadraKills = playerParticipant.quadraKills || 0;
        const tripleKills = playerParticipant.tripleKills || 0;
        const doubleKills = playerParticipant.doubleKills || 0;
        const killingSpree = playerParticipant.largestKillingSpree || 0;
        
        totalPentaKills += pentaKills;
        totalQuadraKills += quadraKills;
        totalTripleKills += tripleKills;
        totalDoubleKills += doubleKills;
        
        // Track longest killing spree
        if (killingSpree > longestKillingSpree) {
          longestKillingSpree = killingSpree;
          longestSpreeGame = {
            spree: killingSpree,
            matchId: match.gameId,
            date: gameDate,
            championName: playerParticipant.championName,
            kills: playerParticipant.kills
          };
        }
        
        // Track penta kills
        if (pentaKills > 0) {
          pentaMatches.push({
            date: gameDate,
            champion: playerParticipant.championName,
            count: pentaKills
          });
          
          if (pentaKills > bestPentaGame.pentaKills) {
            bestPentaGame = {
              pentaKills,
              matchId: match.gameId,
              date: gameDate,
              championName: playerParticipant.championName,
              kills: playerParticipant.kills,
              deaths: playerParticipant.deaths,
              assists: playerParticipant.assists
            };
          }
        }
        
        // Track quadra kills
        if (quadraKills > 0) {
          quadraMatches.push({
            date: gameDate,
            champion: playerParticipant.championName,
            count: quadraKills
          });
        }
      }
    }
    
    if (processedMatches === 0) {
      throw new Error('No valid matches to analyze');
    }
    
    // Calculate averages
    const avgDoublesPerGame = totalDoubleKills / processedMatches;
    const avgTriplesPerGame = totalTripleKills / processedMatches;
    const avgQuadrasPerGame = totalQuadraKills / processedMatches;
    const avgPentasPerGame = totalPentaKills / processedMatches;
    
    // Determine player's multikill prowess
    let multikillRating = 'Warming Up';
    let multikillEmoji = '🎯';
    
    if (totalPentaKills >= 5) {
      multikillRating = 'Pentakill Legend';
      multikillEmoji = '👑';
    } else if (totalPentaKills >= 3) {
      multikillRating = 'Elite Slayer';
      multikillEmoji = '💎';
    } else if (totalPentaKills >= 1) {
      multikillRating = 'Pentakill Achiever';
      multikillEmoji = '⭐';
    } else if (totalQuadraKills >= 10) {
      multikillRating = 'Quadra Master';
      multikillEmoji = '🔥';
    } else if (totalQuadraKills >= 5) {
      multikillRating = 'Multikill Hunter';
      multikillEmoji = '⚡';
    } else if (totalTripleKills >= 20) {
      multikillRating = 'Triple Threat';
      multikillEmoji = '✨';
    } else if (totalTripleKills >= 10) {
      multikillRating = 'Skilled Eliminator';
      multikillEmoji = '🎯';
    }
    
    // Determine spree rating
    let spreeRating = 'Getting Started';
    if (longestKillingSpree >= 20) {
      spreeRating = 'Legendary';
    } else if (longestKillingSpree >= 15) {
      spreeRating = 'Godlike';
    } else if (longestKillingSpree >= 10) {
      spreeRating = 'Dominating';
    } else if (longestKillingSpree >= 7) {
      spreeRating = 'Killing Spree';
    } else if (longestKillingSpree >= 5) {
      spreeRating = 'Rampage';
    }
    
    console.log(`[computeKillingSpree] Analysis complete:`, {
      pentaKills: totalPentaKills,
      quadraKills: totalQuadraKills,
      tripleKills: totalTripleKills,
      doubleKills: totalDoubleKills,
      longestSpree: longestKillingSpree,
      rating: multikillRating
    });
    
    // Build visualization data
    const vizData = {
      type: 'killing_spree_stats',
      stats: {
        pentaKills: totalPentaKills,
        quadraKills: totalQuadraKills,
        tripleKills: totalTripleKills,
        doubleKills: totalDoubleKills,
        longestSpree: longestKillingSpree,
        spreeChampion: longestSpreeGame.championName,
        pentaChampion: bestPentaGame.championName || 'None'
      },
      bars: [
        {
          label: 'Penta Kills',
          value: totalPentaKills,
          color: '#FFD700', // Gold
          maxValue: Math.max(5, totalPentaKills)
        },
        {
          label: 'Quadra Kills',
          value: totalQuadraKills,
          color: '#C0C0C0', // Silver
          maxValue: Math.max(20, totalQuadraKills)
        },
        {
          label: 'Triple Kills',
          value: totalTripleKills,
          color: '#CD7F32', // Bronze
          maxValue: Math.max(50, totalTripleKills)
        },
        {
          label: 'Double Kills',
          value: totalDoubleKills,
          color: '#4A90E2', // Blue
          maxValue: Math.max(100, totalDoubleKills)
        }
      ]
    };
    
    // Build insight summary
    const details: string[] = [
      `Analyzed ${processedMatches} matches for multikill achievements`,
      `Longest killing spree: ${longestKillingSpree} kills (${spreeRating})`,
      `Total multikills:`,
      `  🥇 Penta Kills: ${totalPentaKills}`,
      `  🥈 Quadra Kills: ${totalQuadraKills}`,
      `  🥉 Triple Kills: ${totalTripleKills}`,
      `  🎯 Double Kills: ${totalDoubleKills}`,
      ''
    ];
    
    // Add longest spree details
    if (longestKillingSpree > 0) {
      details.push(`Longest spree: ${longestKillingSpree} kills on ${longestSpreeGame.championName} (${longestSpreeGame.date})`);
      details.push(`Total kills that game: ${longestSpreeGame.kills}`);
      details.push('');
    }
    
    // Add penta kill details
    if (totalPentaKills > 0) {
      details.push(`🎊 PENTAKILL GAMES (${pentaMatches.length} matches):`);
      pentaMatches.forEach((penta, idx) => {
        details.push(`${idx + 1}. ${penta.champion} - ${penta.count} penta${penta.count > 1 ? 's' : ''} (${penta.date})`);
      });
      details.push('');
      
      if (bestPentaGame.pentaKills > 1) {
        details.push(`🌟 Most pentas in one game: ${bestPentaGame.pentaKills} on ${bestPentaGame.championName}!`);
      }
    } else {
      details.push('No pentakills yet - but the hunt continues!');
    }
    
    // Add quadra kill details
    if (totalQuadraKills > 0 && quadraMatches.length > 0) {
      details.push('');
      details.push(`Recent Quadra Kills (showing ${Math.min(5, quadraMatches.length)}):`);
      quadraMatches.slice(0, 5).forEach((quadra, idx) => {
        details.push(`${idx + 1}. ${quadra.champion} - ${quadra.count} quadra${quadra.count > 1 ? 's' : ''} (${quadra.date})`);
      });
    }
    
    // Performance analysis
    details.push('');
    if (avgDoublesPerGame >= 2) {
      details.push('💪 Excellent multikill frequency! You\'re consistently getting kills.');
    } else if (avgDoublesPerGame >= 1) {
      details.push('⚡ Good multikill rate. You know how to capitalize on opportunities.');
    } else if (avgDoublesPerGame >= 0.5) {
      details.push('🎯 Decent multikill presence. Look for more cleanup opportunities.');
    } else {
      details.push('🌱 Room to grow! Focus on staying alive to chain kills together.');
    }
    
    let summary = '';
    let action = '';
    
    if (totalPentaKills >= 3) {
      summary = `${multikillEmoji} ${multikillRating}! You've achieved ${totalPentaKills} pentakills this year - you're a true carry! Your longest killing spree was ${longestKillingSpree} kills. With ${totalQuadraKills} quadras, ${totalTripleKills} triples, and ${totalDoubleKills} doubles, you know how to dominate teamfights.`;
      action = 'Keep that killer instinct sharp! You\'re already among the elite. Consider uploading your pentakill highlights!';
    } else if (totalPentaKills >= 1) {
      summary = `${multikillEmoji} ${multikillRating}! You've earned ${totalPentaKills} pentakill${totalPentaKills > 1 ? 's' : ''} this year! Your longest killing spree reached ${longestKillingSpree} kills. You've also racked up ${totalQuadraKills} quadras, ${totalTripleKills} triples, and ${totalDoubleKills} double kills.`;
      action = totalQuadraKills >= 5 
        ? 'You\'re so close to more pentas! Keep pressuring and looking for cleanup opportunities.'
        : 'Great start! Focus on staying alive in fights to chain more kills together.';
    } else if (totalQuadraKills >= 5) {
      summary = `${multikillEmoji} ${multikillRating}! While you haven't secured a pentakill yet, your ${totalQuadraKills} quadra kills show you have the potential! Your longest killing spree was ${longestKillingSpree} kills, with ${totalTripleKills} triples and ${totalDoubleKills} doubles.`;
      action = 'You\'re one kill away from pentakill glory! Focus on cleanup after getting a quadra - flash for that last kill!';
    } else if (totalTripleKills >= 20) {
      summary = `${multikillEmoji} ${multikillRating}! You've scored ${totalTripleKills} triple kills this year, showing consistent damage output. Your longest killing spree reached ${longestKillingSpree} kills, with ${totalQuadraKills} quadras and ${totalDoubleKills} doubles.`;
      action = 'You\'re getting close! Focus on positioning to survive longer in fights and chain kills into quadras.';
    } else {
      summary = `${multikillEmoji} You're ${multikillRating}! With ${totalTripleKills} triple kills, ${totalQuadraKills} quadras, and ${totalDoubleKills} double kills, you're building momentum. Your longest killing spree was ${longestKillingSpree} kills.`;
      action = 'Focus on: 1) Staying alive in fights, 2) Target selection (kill low-HP enemies first), 3) Positioning to reach multiple targets.';
    }
    
    const payload: ScenePayload = {
      sceneId: 'killing_spree',
      vizKind: 'bar',
      insight: {
        summary,
        details,
        action,
        metrics: [
          {
            label: 'Penta Kills',
            value: totalPentaKills,
            context: totalPentaKills > 0 ? multikillRating : 'The dream awaits'
          },
          {
            label: 'Quadra Kills',
            value: totalQuadraKills,
            context: `across ${processedMatches} games`
          },
          {
            label: 'Longest Spree',
            value: longestKillingSpree,
            unit: 'kills',
            context: spreeRating
          },
          {
            label: 'Triple Kills',
            value: totalTripleKills,
            context: `${avgTriplesPerGame.toFixed(2)} per game`
          },
          {
            label: 'Double Kills',
            value: totalDoubleKills,
            context: `${avgDoublesPerGame.toFixed(2)} per game`
          }
        ],
        vizData
      }
    };
    
    console.log(`[computeKillingSpree] Returning payload for killing_spree`);
    return payload;
    
  } catch (error) {
    console.error('[computeKillingSpree] Error:', error);
    
    return {
      sceneId: 'killing_spree',
      vizKind: 'bar',
      insight: {
        summary: 'Unable to analyze killing sprees',
        details: [
          'There was an error processing your match data',
          error instanceof Error ? error.message : 'Unknown error'
        ],
        action: 'Please try again later or contact support if the issue persists',
        metrics: [],
        vizData: {
          type: 'killing_spree_stats',
          bars: []
        }
      }
    };
  }
}
