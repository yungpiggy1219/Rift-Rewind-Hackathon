import { ScenePayload } from '../types';
import { computeAggregates } from '../riot';

export async function computeYearInMotion(ctx: { puuid: string; season: string }): Promise<ScenePayload> {
  try {
    // For scene 1, we only need basic stats: total matches, total hours, and peak month
    const aggregates = await computeAggregates(ctx.puuid, ctx.season);
    
    // Find peak month by hours played
    const peakMonth = Object.entries(aggregates.months).reduce((peak, [month, data]) => 
      data.hours > peak.hours ? { month, hours: data.hours } : peak,
      { month: 'N/A', hours: 0 }
    );

    return {
      sceneId: "year_in_motion",
      insight: {
        summary: `${aggregates.totals.matches} matches. ${Math.round(aggregates.totals.hours)} hours of data collected. ${peakMonth.month} — your peak of activity.`,
        details: [
          `You played ${aggregates.totals.matches} matches in ${ctx.season}`,
          `Total time invested: ${Math.round(aggregates.totals.hours)} hours`,
          `Peak activity: ${peakMonth.month} with ${Math.round(peakMonth.hours)} hours played`
        ],
        action: "Your gaming journey shows dedication - keep pushing forward",
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
          }
        ],
        vizData: {
          type: "basic_stats",
          totalMatches: aggregates.totals.matches,
          totalHours: Math.round(aggregates.totals.hours),
          peakMonth: peakMonth.month,
          peakHours: Math.round(peakMonth.hours)
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
          { label: "Peak Month", value: "N/A" }
        ],
        vizData: {
          type: "basic_stats",
          totalMatches: 0,
          totalHours: 0,
          peakMonth: "N/A",
          peakHours: 0
        }
      }
    };
  }
}