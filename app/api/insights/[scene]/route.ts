import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SceneId } from '@/src/lib/types';
import { getSceneDefinition } from '@/src/lib/sceneRegistry';
import * as cache from '@/src/lib/cache';

const InsightRequestSchema = z.object({
  puuid: z.string(),
  season: z.string().default('2025')
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ scene: string }> }
) {
  try {
    const resolvedParams = await params;
    console.log('Received params:', resolvedParams);
    const sceneId = resolvedParams.scene as SceneId;
    const body = await request.json();
    const { puuid, season } = InsightRequestSchema.parse(body);

    // Validate scene ID
    const validScenes: SceneId[] = [
      "year_in_motion", "signature_style", "growth_over_time", "peak_performance",
      "weaknesses", "allies", "aram", "social_comparison", "legacy", "path_forward"
    ];
    
    if (!validScenes.includes(sceneId)) {
      return NextResponse.json(
        { error: `Invalid scene ID: ${sceneId}. Valid scenes: ${validScenes.join(', ')}` },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = cache.cacheKeys.scene(puuid, sceneId, season);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Get scene definition
    const sceneDefinition = getSceneDefinition(sceneId);
    if (!sceneDefinition) {
      return NextResponse.json(
        { error: `Scene definition not found for: ${sceneId}` },
        { status: 500 }
      );
    }

    // Compute scene payload
    const payload = await sceneDefinition.compute({ puuid, season });
    
    // Cache the result
    await cache.set(cacheKey, payload);
    
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Insights API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute insights' },
      { status: 500 }
    );
  }
}