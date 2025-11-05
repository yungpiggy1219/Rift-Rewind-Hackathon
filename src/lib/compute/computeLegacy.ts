import { ScenePayload } from '../types';

export async function computeLegacy(ctx: { puuid: string; season: string }): Promise<ScenePayload> {
  // TODO: Implement legacy analysis
  // This should highlight memorable moments and achievements
  
  return {
    sceneId: "legacy",
    insight: {
      summary: "No legacy data available",
      details: [
        "Unable to identify memorable moments and achievements",
        "Legacy analysis requires extensive match history",
        "This feature highlights comeback victories, exceptional performances, and milestones"
      ],
      action: "Play more games to create memorable moments and build your League legacy",
      metrics: [
        { label: "Comeback Wins", value: "N/A" },
        { label: "Biggest Comeback", value: "N/A" },
        { label: "Pentakills", value: "N/A" },
        { label: "Positive Attitude", value: "N/A" }
      ],
      vizData: {
        type: "highlight",
        achievements: []
      }
    }
  };
}