import { ScenePayload } from '../types';
import { computeAggregates } from '../riot';

export async function computeYearInMotion(ctx: { puuid: string; season: string }): Promise<ScenePayload> {
  try {
    const aggregates = await computeAggregates(ctx.puuid, ctx.season);
    
    // Calculate activity heatmap data
    const monthlyActivity = Object.entries(aggregates.months).map(([month, data]) => ({
      month,
      matches: data.matches,
      hours: Math.round(data.hours * 10) / 10,
      intensity: Math.min(data.matches / 10, 1) // Normalize to 0-1 scale
    }));

    // Find peak activity period
    const peakMonth = monthlyActivity.reduce((peak, current) => 
      current.matches > peak.matches ? current : peak
    );

    // Calculate consistency score
    const avgMatches = aggregates.totals.matches / monthlyActivity.length;
    const variance = monthlyActivity.reduce((sum, month) => 
      sum + Math.pow(month.matches - avgMatches, 2), 0) / monthlyActivity.length;
    const consistencyScore = Math.max(0, 100 - (Math.sqrt(variance) / avgMatches) * 100);

    return {
      sceneId: "year_in_motion",
      insight: {
        summary: `Your ${ctx.season} journey: ${aggregates.totals.matches} matches across ${monthlyActivity.length} months`,
        details: [
          `You invested ${aggregates.totals.hours} hours into League this year`,
          `Peak activity was in ${peakMonth.month} with ${peakMonth.matches} matches`,
          `Your consistency score: ${Math.round(consistencyScore)}% - ${consistencyScore > 70 ? 'remarkably steady' : consistencyScore > 40 ? 'moderately consistent' : 'highly variable'} gameplay pattern`
        ],
        action: consistencyScore < 50 
          ? "Consider establishing a more regular play schedule to build momentum"
          : "Your consistent engagement shows dedication - maintain this rhythm",
        metrics: [
          {
            label: "Total Matches",
            value: aggregates.totals.matches,
            unit: " games"
          },
          {
            label: "Time Invested", 
            value: aggregates.totals.hours,
            unit: " hours"
          },
          {
            label: "Peak Month",
            value: peakMonth.matches,
            unit: ` matches in ${peakMonth.month}`
          },
          {
            label: "Consistency",
            value: Math.round(consistencyScore),
            unit: "%",
            trend: consistencyScore > 60 ? "up" : "stable"
          }
        ],
        vizData: {
          type: "heatmap",
          months: monthlyActivity,
          peakMonth: peakMonth.month,
          avgMatches: Math.round(avgMatches)
        }
      }
    };
  } catch (error) {
    return {
      sceneId: "year_in_motion",
      insight: {
        summary: "No activity data available",
        details: [
          "Unable to load match data for analysis",
          "This could be due to missing API key or no matches found",
          "Please ensure you have played ranked games in the selected season"
        ],
        action: "Play some ranked games and try again later",
        metrics: [
          { label: "Total Matches", value: "N/A" },
          { label: "Time Invested", value: "N/A" },
          { label: "Peak Month", value: "N/A" },
          { label: "Consistency", value: "N/A" }
        ],
        vizData: {
          type: "heatmap",
          months: [],
          peakMonth: null,
          avgMatches: 0
        }
      }
    };
  }
}