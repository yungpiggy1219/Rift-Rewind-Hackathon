import { NextRequest, NextResponse } from 'next/server';
import * as cache from '@/src/lib/cache';
import { AgentId, SceneId, SceneInsight, NarrationResponse } from '@/src/lib/types';

// For now, return a simple narration without calling external AI
// You can integrate AWS Bedrock or other AI services later
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

    console.log(`[Narrate API] Cache miss, generating narration...`);

    // Generate simple narration based on the insight
    // This is a placeholder - you can integrate with AWS Bedrock or other AI services
    const narration = generateSimpleNarration(agentId, sceneId, insight);

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

// Simple narration generator (placeholder for AI integration)
function generateSimpleNarration(
  agentId: AgentId,
  sceneId: SceneId,
  insight: SceneInsight
): NarrationResponse {
  // Agent personalities
  const agentIntros: Record<AgentId, string> = {
    'velkoz': "Greetings, mortal. I am Vel'Koz, the Eye of the Void, and I have analyzed your performance.",
    'teemo': "Hehe! Teemo here! I've been tracking your moves all year long!",
    'heimer': "Eureka! Professor Heimerdinger at your service. I've computed some fascinating metrics!",
    'kayle': "Justice has been served. I, Kayle the Righteous, have observed your journey.",
    'draven': "DRAVEN has reviewed your plays, and here's what the BEST has to say!"
  };

  const intro = agentIntros[agentId] || "Let me tell you about your year...";
  
  return {
    title: `${sceneId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    opening: intro,
    analysis: insight.summary,
    actionable: insight.action,
    tags: [agentId, sceneId]
  };
}
