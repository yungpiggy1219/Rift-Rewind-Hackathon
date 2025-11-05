import { ScenePayload } from '../types';
import { computeAggregates } from '../riot';

export async function computePeak(ctx: { puuid: string; season: string }): Promise<ScenePayload> {
  const aggregates = await computeAggregates(ctx.puuid, ctx.season);
  const peak = aggregates.peak;
  
  // Calculate peak performance score
  const kdaScore = (peak.kills + peak.assists) / Math.max(peak.deaths, 1);
  const gpmScore = peak.gpm;
  
  // Normalize scores for comparison (rough percentiles)
  const kdaPercentile = Math.min(95, Math.max(5, (kdaScore - 1) * 30 + 50));
  const gpmPercentile = Math.min(95, Math.max(5, (gpmScore - 200) / 4 + 50));
  
  const overallPerformance = (kdaPercentile + gpmPercentile) / 2;
  
  // Determine performance tier
  let performanceTier: string;
  let tierDescription: string;
  
  if (overallPerformance >= 85) {
    performanceTier = "Legendary";
    tierDescription = "a truly exceptional performance that showcases your peak potential";
  } else if (overallPerformance >= 70) {
    performanceTier = "Outstanding";
    tierDescription = "an impressive display of skill and game knowledge";
  } else if (overallPerformance >= 55) {
    performanceTier = "Solid";
    tierDescription = "a well-executed game demonstrating good fundamentals";
  } else {
    performanceTier = "Developing";
    tierDescription = "a learning experience with clear areas for improvement";
  }

  // Calculate how much better this was than average
  const avgKda = aggregates.kda.series.reduce((sum, val) => sum + val, 0) / aggregates.kda.series.length;
  const avgGpm = aggregates.gpm.series.reduce((sum, val) => sum + val, 0) / aggregates.gpm.series.length;
  
  const kdaImprovement = ((kdaScore - avgKda) / avgKda) * 100;
  const gpmImprovement = ((gpmScore - avgGpm) / avgGpm) * 100;

  return {
    sceneId: "peak_performance",
    insight: {
      summary: `${performanceTier} Performance: ${tierDescription}`,
      details: [
        `On ${new Date(peak.date).toLocaleDateString()}, you achieved a ${peak.kills}/${peak.deaths}/${peak.assists} KDA`,
        `Your gold per minute reached ${peak.gpm}, ${Math.round(gpmImprovement)}% above your average`,
        `This KDA of ${Math.round(kdaScore * 100) / 100} was ${Math.round(kdaImprovement)}% better than your typical performance`,
        `This game represents the ${Math.round(overallPerformance)}th percentile of your capabilities`
      ],
      action: overallPerformance >= 70
        ? "Analyze this match to identify what conditions led to this peak performance and replicate them"
        : "Use this game as a baseline - focus on consistency to reach this level more often",
      metrics: [
        {
          label: "Peak KDA",
          value: `${peak.kills}/${peak.deaths}/${peak.assists}`,
          context: `${Math.round(kdaScore * 100) / 100} ratio`
        },
        {
          label: "Peak GPM",
          value: peak.gpm,
          unit: " gold",
          trend: "up"
        },
        {
          label: "Performance Tier",
          value: performanceTier,
          context: `${Math.round(overallPerformance)}th percentile`
        },
        {
          label: "Above Average",
          value: Math.round((kdaImprovement + gpmImprovement) / 2),
          unit: "%",
          trend: "up"
        }
      ],
      vizData: {
        type: "highlight",
        peakGame: {
          date: peak.date,
          kills: peak.kills,
          deaths: peak.deaths,
          assists: peak.assists,
          gpm: peak.gpm,
          kda: kdaScore,
          matchId: peak.matchId
        },
        comparison: {
          avgKda: Math.round(avgKda * 100) / 100,
          avgGpm: Math.round(avgGpm),
          kdaImprovement: Math.round(kdaImprovement),
          gpmImprovement: Math.round(gpmImprovement)
        },
        performanceTier,
        percentile: Math.round(overallPerformance)
      }
    }
  };
}