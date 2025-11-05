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

    // Find peak activity month (by hours spent, not just matches)
    const peakMonth = monthlyActivity.reduce((peak, current) => 
      current.hours > peak.hours ? current : peak
    );

    // Calculate consistency score
    const avgMatches = aggregates.totals.matches / Math.max(monthlyActivity.length, 1);
    const variance = monthlyActivity.reduce((sum, month) => 
      sum + Math.pow(month.matches - avgMatches, 2), 0) / Math.max(monthlyActivity.length, 1);
    const consistencyScore = Math.max(0, 100 - (Math.sqrt(variance) / avgMatches) * 100);

    return {
      sceneId: "year_in_motion",
      insight: {
        summary: `${aggregates.totals.matches} matches. ${Math.round(aggregates.totals.hours)} hours of data collected. ${peakMonth.month} — your peak of activity — demonstrated unrelenting commitment. Fascinating levels of consistency... for a human.`,
        details: [
          `You played ${aggregates.totals.matches} matches in ${ctx.season}`,
          `Total time invested: ${Math.round(aggregates.totals.hours)} hours`,
          `Peak activity: ${peakMonth.month} with ${Math.round(peakMonth.hours)} hours played`,
          `${monthlyActivity.length} months of gameplay tracked`,
          `Consistency score: ${Math.round(consistencyScore)}%`
        ],
        action: consistencyScore < 50 
          ? "Consider establishing a more regular play schedule to build momentum"
          : "Your consistent engagement shows dedication - maintain this rhythm",
        metrics: [
          {
            label: "Total Matches",
            value: aggregates.totals.matches,
            unit: ""
          },
          {
            label: "Time Invested", 
            value: Math.round(aggregates.totals.hours),
            unit: " hours"
          },
          {
            label: "Peak Month",
            value: peakMonth.month,
            context: `${Math.round(peakMonth.hours)} hours`
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
          avgMatches: Math.round(avgMatches),
          totalHours: Math.round(aggregates.totals.hours)
        }
      }
    };
  } catch (error) {
    console.error('Error in computeYearInMotion:', error);
    return {
      sceneId: "year_in_motion",
      insight: {
        summary: "0 matches. 0 hours of data collected. Unable to determine peak activity. No data available for analysis.",
        details: [
          "Unable to load match data for analysis",
          "This could be due to missing API key or no matches found",
          "Please ensure you have played games in the selected season"
        ],
        action: "Play some games and try again later",
        metrics: [
          { label: "Total Matches", value: 0, unit: "" },
          { label: "Time Invested", value: 0, unit: " hours" },
          { label: "Peak Month", value: "N/A" },
          { label: "Consistency", value: 0, unit: "%" }
        ],
        vizData: {
          type: "heatmap",
          months: [],
          peakMonth: null,
          avgMatches: 0,
          totalHours: 0
        }
      }
    };
  }
}