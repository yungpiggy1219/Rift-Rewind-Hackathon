import { ScenePayload } from '../types';

export async function computeLegacy(ctx: { puuid: string; season: string }): Promise<ScenePayload> {
  // TODO: Implement legacy analysis
  // This should highlight memorable moments and achievements
  
  return {
    sceneId: "legacy",
    insight: {
      summary: "The Comeback Artist - Your 2025 legacy is defined by clutch plays and never giving up",
      details: [
        "You've won 8 games where your team was behind by 5000+ gold",
        "Highest comeback: 12,000 gold deficit overcome in a 47-minute thriller",
        "Your pentakill on Jinx became a highlight reel moment",
        "Maintained positive attitude in 92% of games based on chat analysis"
      ],
      action: "Your mental resilience is your greatest strength - share this positive energy with future teammates",
      metrics: [
        { label: "Comeback Wins", value: 8, unit: " games", trend: "up" },
        { label: "Biggest Comeback", value: 12000, unit: " gold deficit" },
        { label: "Pentakills", value: 1, context: "Jinx masterpiece" },
        { label: "Positive Attitude", value: 92, unit: "%", trend: "up" }
      ],
      vizData: {
        type: "highlight",
        achievements: [
          { title: "The Great Comeback", description: "12,000 gold deficit overcome", date: "2025-08-15" },
          { title: "Pentakill Master", description: "Perfect teamfight execution", date: "2025-06-22" },
          { title: "Positive Leader", description: "92% positive communication", ongoing: true }
        ]
      }
    }
  };
}