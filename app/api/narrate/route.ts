import { NextRequest, NextResponse } from 'next/server';
import * as cache from '@/src/lib/cache';
import { AgentId, SceneId, SceneInsight, NarrationResponse } from '@/src/lib/types';
import { generateAgentNarration } from '@/lib/aws-bedrock';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, sceneId, insight, playerName, puuid } = body as {
      agentId: AgentId;
      sceneId: SceneId;
      insight: SceneInsight;
      playerName?: string;
      puuid?: string;
    };

    if (!agentId || !sceneId || !insight) {
      return NextResponse.json(
        { error: 'agentId, sceneId, and insight are required' },
        { status: 400 }
      );
    }

    console.log(`[Narrate API] Generating narration for ${agentId} on ${sceneId}`);

    // Check cache first - use puuid if available, fallback to playerName
    const cacheKey = cache.cacheKeys.narration(agentId, sceneId, puuid || playerName || 'unknown');
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

    console.log(`[Narrate API] AWS Credentials Check:`, {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      hasRegion: !!process.env.AWS_REGION,
      region: process.env.AWS_REGION
    });

    let narration: NarrationResponse;

    if (hasAWSCredentials) {
      try {
        console.log(`[Narrate API] ✅ Using AWS Bedrock for AI-generated narration`);
        // Use AWS Bedrock for AI-generated narration
        narration = await generateAgentNarration(agentId, sceneId, insight, playerName || 'Summoner');
        console.log(`[Narrate API] ✅ SUCCESS: Generated AI narration with AWS Bedrock`);
      } catch (awsError) {
        console.error('[Narrate API] ❌ AWS Bedrock error, falling back to simple narration:', awsError);
        // Fall back to simple narration if AWS fails
        narration = generateSimpleNarration(agentId, sceneId, insight, playerName);
        console.log(`[Narrate API] ⚠️ FALLBACK: Using simple narration (AWS Bedrock failed)`);
      }
    } else {
      console.log(`[Narrate API] ⚠️ FALLBACK: AWS credentials not configured, using simple narration`);
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
    'velkoz': `Greetings, mortal ${name}. I am Vel'Koz, the Eye of the Void, and I have analyzed your performance. The data reveals intriguing patterns...`,
    'teemo': `Hehe! Captain Teemo here, ${name}! I've been tracking your moves all year long!`,
    'heimer': `Eureka! Professor Heimerdinger at your service, ${name}. I've computed some fascinating metrics!`,
  };

  const intro = agentIntros[agentId] || `Let me tell you about your year, ${name}...`;
  
  // Generate scene-specific follow-up questions
  const followUpQuestions = generateFollowUpQuestions(sceneId);
  
  return {
    title: `${sceneId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    opening: intro,
    analysis: insight.summary,
    actionable: insight.action,
    tags: [agentId, sceneId],
    followUpQuestions
  };
}

// Generate follow-up questions based on the scene
function generateFollowUpQuestions(sceneId: SceneId) {
  const questions: Record<SceneId, Array<{ question: string; context: string }>> = {
    'year_in_motion': [
      { question: 'Which month was my most active?', context: 'Peak activity analysis' },
      { question: 'How does this compare to other players?', context: 'Comparative metrics' },
    ],
    'signature_champion': [
      { question: 'Should I expand my champion pool?', context: 'Champion diversity' },
      { question: 'What are my best matchups with this champion?', context: 'Matchup analysis' },
      { question: 'How can I improve my win rate?', context: 'Performance optimization' },
    ],
    'signature_position': [
      { question: 'Should I try other roles?', context: 'Role flexibility' },
      { question: 'What champions work best in this position?', context: 'Champion recommendations' },
    ],
    'damage_share': [
      { question: 'How can I deal more consistent damage?', context: 'Damage optimization' },
      { question: 'Am I building items correctly?', context: 'Build analysis' },
    ],
    'damage_taken': [
      { question: 'Am I tanking too much or too little?', context: 'Positioning analysis' },
      { question: 'How can I improve my survivability?', context: 'Survival tips' },
    ],
    'total_healed': [
      { question: 'Am I using my healing abilities optimally?', context: 'Healing efficiency' },
      { question: 'Should I play more support champions?', context: 'Role recommendations' },
    ],
    'gold_share': [
      { question: 'How can I improve my gold income?', context: 'Economy optimization' },
      { question: 'Am I farming efficiently?', context: 'CS analysis' },
    ],
    'farmer': [
      { question: 'What\'s a good CS target for my rank?', context: 'CS benchmarks' },
      { question: 'How can I improve my last-hitting?', context: 'Farming techniques' },
    ],
    'growth_over_time': [
      { question: 'What caused my performance changes?', context: 'Trend analysis' },
      { question: 'How can I maintain consistency?', context: 'Consistency tips' },
    ],
    'vision_score': [
      { question: 'How many wards should I place per game?', context: 'Vision benchmarks' },
      { question: 'When should I buy control wards?', context: 'Vision strategy' },
    ],
    'peak_performance': [
      { question: 'What made this my best game?', context: 'Peak performance analysis' },
      { question: 'How can I replicate this performance?', context: 'Consistency tips' },
    ],
    'weaknesses': [
      { question: 'How can I die less in lane?', context: 'Lane survival' },
      { question: 'What are common mistakes causing my deaths?', context: 'Error analysis' },
    ],
    'best_friend': [
      { question: 'Who else do I play well with?', context: 'Synergy analysis' },
      { question: 'Should we duo queue more?', context: 'Team recommendations' },
    ],
    'aram': [
      { question: 'What are my best ARAM champions?', context: 'ARAM champion pool' },
      { question: 'How can I improve in ARAM?', context: 'ARAM strategy' },
    ],
    'ranked_stats': [
      { question: 'How can I climb to the next rank?', context: 'Rank progression' },
      { question: 'What\'s holding me back?', context: 'Bottleneck analysis' },
    ],
    'killing_spree': [
      { question: 'How can I secure more multi-kills?', context: 'Kill optimization' },
      { question: 'What champions are best for sprees?', context: 'Champion recommendations' },
    ],
    'dragon_slayer': [
      { question: 'How important are objectives for climbing?', context: 'Objective priority' },
      { question: 'Should I contest more dragons?', context: 'Dragon strategy' },
    ],
    'sniper': [
      { question: 'How can I improve my skillshot accuracy?', context: 'Mechanical skills' },
      { question: 'Which champions have the best skillshots?', context: 'Champion analysis' },
    ],
    'fancy_feet': [
      { question: 'How can I dodge more skillshots?', context: 'Movement mechanics' },
      { question: 'What are good positioning tips?', context: 'Positioning guide' },
    ],
    'path_forward': [
      { question: 'What should I focus on next season?', context: 'Goal setting' },
      { question: 'How can I set realistic improvement goals?', context: 'Progress tracking' },
    ],
  };

  return questions[sceneId]?.slice(0, 3) || [
    { question: 'How can I improve in this area?', context: 'General improvement' },
    { question: 'What should I focus on?', context: 'Focus areas' },
  ];
}
