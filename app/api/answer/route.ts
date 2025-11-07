import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AgentId, SceneId, SceneInsight, AnswerRequest, AnswerResponse } from '@/src/lib/types';
import { AGENTS } from '@/src/lib/agents';
import * as cache from '@/src/lib/cache';

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, sceneId, question, insight, playerName } = body as AnswerRequest;

    if (!agentId || !sceneId || !question || !insight) {
      return NextResponse.json(
        { error: 'agentId, sceneId, question, and insight are required' },
        { status: 400 }
      );
    }

    console.log(`[Answer API] Generating answer for ${agentId} on ${sceneId}: ${question}`);

    // Check cache first
    const cacheKey = cache.cacheKeys.narration(
      agentId, 
      `${sceneId}-answer-${question.substring(0, 30)}`, 
      playerName || 'unknown'
    );
    const cachedAnswer = await cache.get(cacheKey);
    
    if (cachedAnswer) {
      console.log(`[Answer API] Cache hit for answer`);
      return NextResponse.json(cachedAnswer);
    }

    console.log(`[Answer API] Cache miss, generating answer with AWS Bedrock...`);

    // Check if AWS credentials are configured
    const hasAWSCredentials = process.env.AWS_ACCESS_KEY_ID && 
                              process.env.AWS_SECRET_ACCESS_KEY &&
                              process.env.AWS_REGION;

    console.log(`[Answer API] AWS Credentials Check:`, {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      hasRegion: !!process.env.AWS_REGION,
      region: process.env.AWS_REGION
    });

    let answer: AnswerResponse;

    if (hasAWSCredentials) {
      try {
        console.log(`[Answer API] ✅ Using AWS Bedrock for AI-generated answer`);
        // Use AWS Bedrock for AI-generated answer
        answer = await generateAgentAnswer(agentId, sceneId, question, insight, playerName || 'Summoner');
        console.log(`[Answer API] ✅ SUCCESS: Generated AI answer with AWS Bedrock`);
      } catch (awsError) {
        console.error('[Answer API] ❌ AWS Bedrock error, falling back to simple answer:', awsError);
        // Fall back to simple answer if AWS fails
        answer = generateSimpleAnswer(agentId, question, insight);
        console.log(`[Answer API] ⚠️ FALLBACK: Using simple answer (AWS Bedrock failed)`);
      }
    } else {
      console.log(`[Answer API] ⚠️ FALLBACK: AWS credentials not configured, using simple answer`);
      // Use simple answer if AWS not configured
      answer = generateSimpleAnswer(agentId, question, insight);
    }

    // Cache the answer for 1 hour
    await cache.setLong(cacheKey, answer);
    console.log(`[Answer API] Generated and cached answer`);

    return NextResponse.json(answer);
  } catch (error) {
    console.error('[Answer API] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate answer',
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}

async function generateAgentAnswer(
  agentId: AgentId,
  sceneId: SceneId,
  question: string,
  insight: SceneInsight,
  playerName: string
): Promise<AnswerResponse> {
  const agent = AGENTS[agentId];
  
  if (!agent) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

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

CONTEXT:
Player "${playerName}" is viewing their year-end recap.
Scene: ${sceneId.replace(/_/g, ' ')}

PLAYER'S ACTUAL DATA:
Summary: ${insight.summary}
Details: ${insight.details.join('\n')}

Key Metrics:
${insight.metrics.map(m => `- ${m.label}: ${m.value}${m.unit || ''} ${m.context ? `(${m.context})` : ''}`).join('\n')}

PLAYER'S QUESTION:
"${question}"

INSTRUCTIONS:
1. Stay completely in character as ${agent.name}
2. Answer the question using the ACTUAL DATA provided above
3. Reference specific numbers from the metrics (e.g., "Your 54.3% win rate indicates...")
4. Make the answer practical and actionable
5. Keep the answer 3-5 sentences
6. Optionally provide 1-3 related tips based on the data
7. Use ${agent.name}'s unique speaking style naturally

Respond in this EXACT JSON format (no markdown, just raw JSON):
{
  "answer": "Your detailed answer in character, referencing the actual data",
  "relatedTips": [
    "Optional tip 1 based on data",
    "Optional tip 2 based on data"
  ]
}`;

  try {
    console.log(`[AWS Bedrock] Generating answer for ${agentId} on ${sceneId}`);
    
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 600,
        temperature: 0.7,
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
    const aiResponse = responseBody.content[0].text;
    
    console.log(`[AWS Bedrock] Raw answer response:`, aiResponse);
    
    // Parse the JSON response
    let jsonText = aiResponse.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').replace(/```\n?$/g, '');
    }
    
    const answer = JSON.parse(jsonText) as AnswerResponse;
    
    console.log(`[AWS Bedrock] Successfully generated answer`);
    return answer;
    
  } catch (error) {
    console.error('[AWS Bedrock] Error generating answer:', error);
    throw error;
  }
}

// Simple answer generator (fallback when AWS is not available)
function generateSimpleAnswer(
  agentId: AgentId,
  question: string,
  insight: SceneInsight
): AnswerResponse {
  const agentIntros: Record<AgentId, string> = {
    'velkoz': 'Through my analysis of your data, I observe that',
    'teemo': 'Based on what I\'ve scouted, I can tell you that',
    'heimer': 'According to my calculations and research, I\'ve found that',
  };

  const intro = agentIntros[agentId] || 'Based on the data,';
  
  // Extract key metric for context
  const primaryMetric = insight.metrics[0];
  const metricContext = primaryMetric 
    ? ` Your ${primaryMetric.label} of ${primaryMetric.value}${primaryMetric.unit || ''} indicates room for improvement.`
    : '';

  return {
    answer: `${intro} ${insight.summary}${metricContext} ${insight.action}`,
    relatedTips: insight.details.slice(0, 2)
  };
}
