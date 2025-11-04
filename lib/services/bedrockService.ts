import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { PlayerStats } from '../types';

export class BedrockService {
  private client: BedrockRuntimeClient;

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  /**
   * Generate an AI recap of player performance
   */
  async generateRecap(stats: PlayerStats, summonerName: string): Promise<string> {
    try {
      const prompt = this.createPrompt(stats, summonerName);

      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      };

      const command = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      return responseBody.content[0].text;
    } catch (error) {
      console.error('Error generating AI recap:', error);
      return this.generateFallbackRecap(stats, summonerName);
    }
  }

  /**
   * Create a prompt for the AI model
   */
  private createPrompt(stats: PlayerStats, summonerName: string): string {
    const recentFormText = stats.recentForm.map(w => w ? 'W' : 'L').join(' ');
    const topChampions = stats.championStats.slice(0, 3).map(c => 
      `${c.championName} (${c.games} games, ${c.winRate.toFixed(1)}% WR)`
    ).join(', ');

    return `Generate a brief, engaging performance recap for League of Legends player "${summonerName}" based on their recent match history.

Stats:
- Total Games: ${stats.totalGames}
- Win Rate: ${stats.winRate}%
- KDA: ${stats.avgKDA} (${stats.avgKills}/${stats.avgDeaths}/${stats.avgAssists})
- Damage per Minute: ${stats.avgDPM}
- Vision Score: ${stats.avgVisionScore}
- Recent Form (last 10): ${recentFormText}
- Top Champions: ${topChampions}

Write a concise 3-4 sentence recap highlighting their strengths, areas for improvement, and recent performance trends. Make it motivating and insightful, like a professional analyst's commentary.`;
  }

  /**
   * Generate a fallback recap if AI service fails
   */
  private generateFallbackRecap(stats: PlayerStats, summonerName: string): string {
    const performance = stats.winRate >= 55 ? 'strong' : stats.winRate >= 50 ? 'solid' : 'challenging';
    const kdaRating = stats.avgKDA >= 3 ? 'excellent' : stats.avgKDA >= 2 ? 'good' : 'developing';
    
    return `${summonerName} has shown ${performance} performance over ${stats.totalGames} recent games with a ${stats.winRate}% win rate. ` +
      `With a ${kdaRating} KDA of ${stats.avgKDA} and ${stats.avgDPM} damage per minute, there's clear potential for growth. ` +
      `Vision control averaging ${stats.avgVisionScore} vision score suggests ${stats.avgVisionScore >= 30 ? 'strong map awareness' : 'room to improve map vision'}. ` +
      `Keep focusing on consistency and you'll climb the ranks!`;
  }
}
