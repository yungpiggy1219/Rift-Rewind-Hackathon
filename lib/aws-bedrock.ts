import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function generateInsights(matchData: any[]): Promise<string> {
  const prompt = `
    Analyze this League of Legends player's match history and provide personalized insights:
    
    Match Data: ${JSON.stringify(matchData, null, 2)}
    
    Please provide:
    1. Key strengths based on performance patterns
    2. Areas for improvement with specific suggestions
    3. Notable achievements or milestones
    4. Fun facts about their gameplay
    
    Keep the tone encouraging and actionable. Focus on trends rather than individual games.
  `;

  try {
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0', // Cost-effective model
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.content[0].text;
  } catch (error) {
    console.error('Error generating insights:', error);
    return 'Unable to generate insights at this time. Please try again later.';
  }
}

export async function generateYearEndSummary(playerData: any): Promise<string> {
  const prompt = `
    Create an engaging year-end summary for this League of Legends player:
    
    Player Data: ${JSON.stringify(playerData, null, 2)}
    
    Create a fun, shareable summary that includes:
    1. Their biggest achievements this year
    2. Most played champions and success rates
    3. Growth and improvement areas
    4. Fun statistics and milestones
    5. A motivational message for next year
    
    Make it personal, celebratory, and shareable on social media.
  `;

  try {
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.content[0].text;
  } catch (error) {
    console.error('Error generating year-end summary:', error);
    return 'Unable to generate summary at this time. Please try again later.';
  }
}