import { ScenePayload } from '../types';
import { computeAggregates } from '../riot';

export async function computeGrowth(ctx: { puuid: string; season: string }): Promise<ScenePayload> {
  try {
    const aggregates = await computeAggregates(ctx.puuid, ctx.season);
    
    // Analyze growth trends across multiple metrics
    const kdaGrowth = ((aggregates.kda.end - aggregates.kda.start) / aggregates.kda.start) * 100;
    const gpmGrowth = aggregates.gpm.deltaPct;
    const winRateGrowth = aggregates.winRate.deltaPct;
    
    // Calculate overall growth score
    const growthMetrics = [kdaGrowth, gpmGrowth, winRateGrowth];
    const positiveGrowth = growthMetrics.filter(g => g > 0).length;
    const avgGrowth = growthMetrics.reduce((sum, g) => sum + g, 0) / growthMetrics.length;
    
    // Determine growth phase
    let growthPhase: string;
    let growthDescription: string;
    
    if (avgGrowth > 15) {
      growthPhase = "Explosive Growth";
      growthDescription = "experiencing rapid improvement across multiple areas";
    } else if (avgGrowth > 5) {
      growthPhase = "Steady Climb";
      growthDescription = "showing consistent improvement over time";
    } else if (avgGrowth > -5) {
      growthPhase = "Plateau Phase";
      growthDescription = "maintaining stable performance with room for breakthrough";
    } else {
      growthPhase = "Adjustment Period";
      growthDescription = "working through challenges to find your optimal playstyle";
    }

    // Find strongest growth area
    const growthAreas = [
      { name: "KDA", value: kdaGrowth, metric: "combat effectiveness" },
      { name: "GPM", value: gpmGrowth, metric: "farming efficiency" },
      { name: "Win Rate", value: winRateGrowth, metric: "game impact" }
    ];
    
    const strongestGrowth = growthAreas.reduce((best, current) => 
      current.value > best.value ? current : best
    );

    return {
      sceneId: "growth_over_time",
      insight: {
        summary: `${growthPhase}: ${growthDescription}`,
        details: [
          `Your KDA improved by ${kdaGrowth > 0 ? '+' : ''}${Math.round(kdaGrowth * 10) / 10}% from ${Math.round(aggregates.kda.start * 100) / 100} to ${Math.round(aggregates.kda.end * 100) / 100}`,
          `Gold per minute ${gpmGrowth > 0 ? 'increased' : 'decreased'} by ${Math.abs(Math.round(gpmGrowth * 10) / 10)}%`,
          `Win rate ${winRateGrowth > 0 ? 'improved' : 'declined'} by ${Math.abs(Math.round(winRateGrowth * 10) / 10)}%`,
          `${positiveGrowth} out of 3 key metrics showed positive growth`
        ],
        action: avgGrowth > 0 
          ? `Continue focusing on ${strongestGrowth.metric} - it's your strongest growth area`
          : "Focus on fundamentals: CS, map awareness, and champion mastery to break through the plateau",
        metrics: [
          {
            label: "KDA Growth",
            value: Math.round(kdaGrowth * 10) / 10,
            unit: "%",
            trend: kdaGrowth > 0 ? "up" : "down"
          },
          {
            label: "GPM Growth",
            value: Math.round(gpmGrowth * 10) / 10,
            unit: "%", 
            trend: gpmGrowth > 0 ? "up" : "down"
          },
          {
            label: "Win Rate Growth",
            value: Math.round(winRateGrowth * 10) / 10,
            unit: "%",
            trend: winRateGrowth > 0 ? "up" : "down"
          },
          {
            label: "Overall Growth Score",
            value: Math.round(avgGrowth * 10) / 10,
            unit: "%",
            trend: avgGrowth > 0 ? "up" : avgGrowth < -5 ? "down" : "stable"
          }
        ],
        vizData: {
          type: "line",
          series: [
            {
              name: "KDA",
              data: aggregates.kda.series.map((value, index) => ({ month: index + 1, value })),
              color: "#3B82F6"
            },
            {
              name: "GPM", 
              data: aggregates.gpm.series.map((value, index) => ({ month: index + 1, value: value / 100 })), // Normalize for display
              color: "#10B981"
            },
            {
              name: "Win Rate",
              data: aggregates.winRate.series.map((value, index) => ({ month: index + 1, value: value * 100 })), // Convert to percentage
              color: "#F59E0B"
            }
          ],
          growthPhase,
          strongestArea: strongestGrowth.name
        }
      }
    };
  } catch (error) {
    return {
      sceneId: "growth_over_time",
      insight: {
        summary: "No growth data available",
        details: [
          "Unable to analyze performance trends",
          "Requires multiple matches across different time periods",
          "Growth analysis needs at least 10+ ranked games"
        ],
        action: "Play more ranked games to enable growth tracking",
        metrics: [
          { label: "KDA Growth", value: "N/A" },
          { label: "GPM Growth", value: "N/A" },
          { label: "Win Rate Growth", value: "N/A" },
          { label: "Overall Growth Score", value: "N/A" }
        ],
        vizData: {
          type: "line",
          series: [],
          growthPhase: "No Data",
          strongestArea: "N/A"
        }
      }
    };
  }
}