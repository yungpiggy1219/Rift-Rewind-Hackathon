import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AgentId, SceneId, SceneInsight, NarrationResponse } from '@/src/lib/types';
import { AGENTS } from '@/src/lib/agents';

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
      modelId: 'amazon.nova-lite-v1:0', // AWS's own lightweight model
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              {
                text: prompt
              }
            ]
          }
        ],
        inferenceConfig: {
          max_new_tokens: 1000,
          temperature: 0.7
        }
      }),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.output.message.content[0].text;
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
      modelId: 'amazon.nova-lite-v1:0',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              {
                text: prompt
              }
            ]
          }
        ],
        inferenceConfig: {
          max_new_tokens: 1500,
          temperature: 0.7
        }
      }),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.output.message.content[0].text;
  } catch (error) {
    console.error('Error generating year-end summary:', error);
    return 'Unable to generate summary at this time. Please try again later.';
  }
}

/**
 * Generate character-based narration for League of Legends year-end recap
 * Uses Claude 3 Haiku via AWS Bedrock for cost-effective, personality-driven narration
 */
export async function generateAgentNarration(
  agentId: AgentId,
  sceneId: SceneId,
  insight: SceneInsight,
  playerName: string
): Promise<NarrationResponse> {
  const agent = AGENTS[agentId];
  
  if (!agent) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  // Build context-rich prompt for the agent with enhanced personality
  const prompt = `You are ${agent.name}, ${agent.title}. 

CHARACTER TRAITS:
- Personality: ${agent.personality}
- Tone: ${agent.tone}
- Catchphrases: ${agent.catchphrases.join(', ')}
- Voice Style: ${agent.voiceStyle}

${agentId === 'velkoz' ? `
SPECIAL NOTE FOR VEL'KOZ:
- You are a void entity obsessed with acquiring knowledge through observation and disintegration
- You view humans as "specimens" and their data as "fascinating research material"
- Use clinical, scientific language: "specimen," "data reveals," "analysis indicates," "fascinating," "intriguing patterns"
- Be slightly condescending but intellectually curious
- Reference your research, experiments, and accumulated knowledge
- Use phrases like "Through rigorous examination," "My ocular sensors detect," "Knowledge through disintegration"
` : ''}

TASK:
You are narrating a League of Legends year-end recap for player "${playerName}".
Scene: ${sceneId.replace(/_/g, ' ')}

PLAYER STATISTICS:
Summary: ${insight.summary}
Details: ${insight.details.join('\n')}
Recommendation: ${insight.action}

Key Metrics:
${insight.metrics.map(m => `- ${m.label}: ${m.value}${m.unit || ''} ${m.context ? `(${m.context})` : ''}`).join('\n')}

INSTRUCTIONS:
1. Stay completely in character as ${agent.name}
2. Use ${agent.name}'s unique speaking style and catchphrases naturally throughout
3. Create an engaging 3-part narration:
   - Opening: A brief character-appropriate greeting (2-3 sentences)
   - Analysis: Discuss the statistics in ${agent.name}'s voice (4-5 sentences, reference specific numbers)
   - Actionable: Give advice in character (2-3 sentences)
4. Be encouraging but honest about performance
5. Reference the specific numbers and metrics provided
6. Make it entertaining and memorable
7. Generate 1-3 follow-up questions that the player might want to ask about this scene
   - Questions should be relevant to the scene and statistics
   - Keep questions in a curious, exploratory tone (not in the agent's voice)
   - Example questions: "How do I improve my KDA?", "Which champions should I focus on?", "What's my rank trajectory?"

Respond in this EXACT JSON format (no markdown, just raw JSON):
{
  "title": "A catchy title for this scene in character",
  "opening": "Your opening lines in character",
  "analysis": "Your analysis of the stats in character",
  "actionable": "Your advice in character",
  "tags": ["relevant", "tags"],
  "followUpQuestions": [
    {
      "question": "A question the player might ask",
      "context": "Brief description of what this explores"
    }
  ]
}`;

  try {
    console.log(`[AWS Bedrock] Generating narration for ${agentId} on ${sceneId} using Amazon Nova Lite`);
    
    const command = new InvokeModelCommand({
      modelId: 'amazon.nova-lite-v1:0', // AWS's own lightweight model
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              {
                text: prompt
              }
            ]
          }
        ],
        inferenceConfig: {
          max_new_tokens: 800,
          temperature: 0.8 // More creative for personality
        }
      }),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const aiResponse = responseBody.output.message.content[0].text;
    
    console.log(`[AWS Bedrock] Raw response from Nova Lite:`, aiResponse);
    
    // Parse the JSON response
    // Handle potential markdown code blocks
    let jsonText = aiResponse.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').replace(/```\n?$/g, '');
    }
    
    const narration = JSON.parse(jsonText) as NarrationResponse;
    
    console.log(`[AWS Bedrock] Successfully generated narration`);
    return narration;
    
  } catch (error) {
    console.error('[AWS Bedrock] Error generating narration:', error);
    throw error;
  }
}