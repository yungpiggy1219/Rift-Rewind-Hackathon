import { NextRequest, NextResponse } from 'next/server';
import * as cache from '@/src/lib/cache';
import { AgentId, SceneId, SceneInsight, NarrationResponse } from '@/src/lib/types';
import { generateAgentNarration } from '@/lib/aws-bedrock';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, sceneId, insight, playerName } = body as {
      agentId: AgentId;
      sceneId: SceneId;
      insight: SceneInsight;
      playerName?: string;
    };

    if (!agentId || !sceneId || !insight) {
      return NextResponse.json(
        { error: 'agentId, sceneId, and insight are required' },
        { status: 400 }
      );
    }

    console.log(`[Narrate API] Generating narration for ${agentId} on ${sceneId}`);

    // Check cache first
    const cacheKey = cache.cacheKeys.narration(agentId, sceneId, playerName || 'unknown');
    const cachedNarration = await cache.get(cacheKey);
    
    if (cachedNarration) {
      console.log(`[Narrate API] Cache hit for narration`);
      return NextResponse.json(cachedNarration);
    }

    console.log(`[Narrate API] Cache miss, generating narration with AWS Bedrock...`);

    // Check if AWS credentials are configured
    const hasAWSCredentials = process.env.AWS_ACCESS_KEY_ID && 
                              process.env.AWS_SECRET_ACCESS_KEY &&
                              process.env.AWS_REGION;

    let narration: NarrationResponse;

    if (hasAWSCredentials) {
      try {
        // Use AWS Bedrock for AI-generated narration
        narration = await generateAgentNarration(agentId, sceneId, insight, playerName || 'Summoner');
        console.log(`[Narrate API] Generated AI narration successfully`);
      } catch (awsError) {
        console.error('[Narrate API] AWS Bedrock error, falling back to simple narration:', awsError);
        // Fall back to simple narration if AWS fails
        narration = generateSimpleNarration(agentId, sceneId, insight, playerName);
      }
    } else {
      console.log(`[Narrate API] AWS credentials not configured, using simple narration`);
      // Use simple narration if AWS not configured
      narration = generateSimpleNarration(agentId, sceneId, insight, playerName);
    }

    // Cache the narration for 1 hour
    await cache.setLong(cacheKey, narration);
    console.log(`[Narrate API] Generated and cached narration`);

    return NextResponse.json(narration);
  } catch (error) {
    console.error('[Narrate API] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate narration',
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}

// Simple narration generator (fallback when AWS is not available)
function generateSimpleNarration(
  agentId: AgentId,
  sceneId: SceneId,
  insight: SceneInsight,
  playerName?: string
): NarrationResponse {
  const name = playerName || 'Summoner';
  
  // Agent personalities
  const agentIntros: Record<AgentId, string> = {
    'velkoz': `Greetings, mortal ${name}. I am Vel'Koz, the Eye of the Void, and I have analyzed your performance.`,
    'teemo': `Hehe! Captain Teemo here, ${name}! I've been tracking your moves all year long!`,
    'heimer': `Eureka! Professor Heimerdinger at your service, ${name}. I've computed some fascinating metrics!`,
    'kayle': `${name}, justice has been served. I, Kayle the Righteous, have observed your journey.`,
    'draven': `Welcome to the League of Draven, ${name}! DRAVEN has reviewed your plays!`
  };

  const intro = agentIntros[agentId] || `Let me tell you about your year, ${name}...`;
  
  return {
    title: `${sceneId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    opening: intro,
    analysis: insight.summary,
    actionable: insight.action,
    tags: [agentId, sceneId]
  };
}
