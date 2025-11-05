import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AgentId, SceneId } from '@/src/lib/types';
import { buildNarration } from '@/src/lib/agents';
import * as cache from '@/src/lib/cache';

const NarrationRequestSchema = z.object({
  agentId: z.enum(['velkoz', 'teemo', 'heimer', 'kayle', 'draven']),
  sceneId: z.enum([
    'year_in_motion', 'signature_style', 'growth_over_time', 'peak_performance',
    'weaknesses', 'allies', 'aram', 'social_comparison', 'legacy', 'path_forward'
  ]),
  insight: z.object({
    summary: z.string(),
    details: z.array(z.string()),
    action: z.string(),
    metrics: z.array(z.object({
      label: z.string(),
      value: z.union([z.number(), z.string()]),
      unit: z.string().optional(),
      trend: z.enum(['up', 'down', 'stable']).optional(),
      context: z.string().optional()
    })),
    vizData: z.any()
  }),
  playerName: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const narrationRequest = NarrationRequestSchema.parse(body);

    // Check cache first
    const cacheKey = cache.cacheKeys.narration(
      narrationRequest.agentId, 
      narrationRequest.sceneId, 
      JSON.stringify(narrationRequest.insight)
    );
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Generate narration using deterministic template
    const narration = buildNarration(narrationRequest);
    
    // TODO: Replace with real LLM integration
    // Example integration point for OpenAI/Anthropic/AWS Bedrock:
    /*
    if (process.env.OPENAI_API_KEY) {
      const llmNarration = await generateLLMNarration(narrationRequest);
      narration = llmNarration;
    }
    */
    
    // Cache the result
    await cache.set(cacheKey, narration);
    
    return NextResponse.json(narration);
  } catch (error) {
    console.error('Narration API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate narration' },
      { status: 500 }
    );
  }
}