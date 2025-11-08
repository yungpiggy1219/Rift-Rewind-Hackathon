import { NextRequest, NextResponse } from 'next/server';
import * as cache from '@/src/lib/cache';
import { getAccountByPuuid } from '@/src/lib/riot';

const RIOT_API_KEY = process.env.RIOT_API_KEY!;
const RIOT_REGION = process.env.RIOT_REGION || 'americas';

// Rate limiting: 20 requests per second, 100 requests per 2 minutes
const RATE_LIMIT_PER_SECOND = 20;
const RATE_LIMIT_PER_2_MINUTES = 100;
const REQUEST_INTERVAL_MS = 1000 / RATE_LIMIT_PER_SECOND; // ~50ms between requests

// Track request timestamps for rate limiting
let requestTimestamps: number[] = [];

// Helper function to enforce rate limiting
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();

  // Remove timestamps older than 2 minutes
  requestTimestamps = requestTimestamps.filter(ts => now - ts < 120000);

  // Check 2-minute limit
  if (requestTimestamps.length >= RATE_LIMIT_PER_2_MINUTES) {
    const oldestRequest = Math.min(...requestTimestamps);
    const waitTime = 120000 - (now - oldestRequest);
    if (waitTime > 0) {
      console.log(`[match-ids] Rate limit: waiting ${waitTime}ms for 2-minute window`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return enforceRateLimit(); // Recheck after waiting
    }
  }

  // Check per-second limit
  const recentRequests = requestTimestamps.filter(ts => now - ts < 1000);
  if (recentRequests.length >= RATE_LIMIT_PER_SECOND) {
    const waitTime = REQUEST_INTERVAL_MS;
    console.log(`[match-ids] Rate limit: waiting ${waitTime}ms for per-second limit`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  requestTimestamps.push(now);
}

async function riotRequest(path: string, region: string = RIOT_REGION, retryCount: number = 0): Promise<string[]> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  try {
    await enforceRateLimit();

    const url = `https://${region}.api.riotgames.com${path}`;
    console.log(`[match-ids] Fetching: ${url} (attempt ${retryCount + 1})`);

    const res = await fetch(url, {
      headers: { 'X-Riot-Token': RIOT_API_KEY },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (res.status === 429) {
      // Rate limit exceeded
      const retryAfter = res.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * baseDelay;

      if (retryCount < maxRetries) {
        console.log(`[match-ids] Rate limited, retrying in ${waitTime}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return riotRequest(path, region, retryCount + 1);
      } else {
        throw new Error(`Rate limit exceeded after ${maxRetries} retries`);
      }
    }

    if (!res.ok) {
      throw new Error(`Riot API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      if (retryCount < maxRetries) {
        const waitTime = Math.pow(2, retryCount) * baseDelay;
        console.log(`[match-ids] Request timeout, retrying in ${waitTime}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return riotRequest(path, region, retryCount + 1);
      }
    }

    console.error(`[match-ids] Request failed after ${retryCount + 1} attempts:`, error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const puuid = searchParams.get('puuid');
    const queue = searchParams.get('queue'); // optional, e.g. 450 for ARAM
    const type = searchParams.get('type');   // optional, e.g. 'ranked'

    if (!puuid) {
      return NextResponse.json({ error: 'PUUID is required' }, { status: 400 });
    }

    // Try to get region from cached account
    const cachedAccount = await getAccountByPuuid(puuid);
    const region = cachedAccount?.region || RIOT_REGION;
    
    console.log(`[match-ids] Using region: ${region} for ${puuid}`);

    // Check shared cache first
    const cacheKey = `match-ids-${puuid}-${region}-${queue || 'all'}-${type || 'all'}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      console.log(`[match-ids] Returning cached match IDs for ${puuid}: ${(cached as { matchIds: string[] }).matchIds.length} matches`);
      return NextResponse.json(cached);
    }

    // Time range: Jan 1, 2025 → Current time (in seconds)
    const startTimestamp = 1735689600; // January 1st, 2025 00:00:00 UTC
    const endTimestamp = Math.floor(Date.now() / 1000); // Current time

    console.log(
      `[match-ids] Season range: ${new Date(startTimestamp * 1000).toISOString()} → ${new Date(endTimestamp * 1000).toISOString()}`
    );

    const allMatchIds: string[] = [];
    let start = 0;
    const batchSize = 100;
    let batchCount = 0;
    const maxBatches = 50; // Limit to prevent excessive API usage (max 5000 matches)
    const startTime = Date.now();
    const maxDuration = 5 * 60 * 1000; // 5 minutes max

    while (batchCount < maxBatches) {
      // Check timeout
      if (Date.now() - startTime > maxDuration) {
        console.log(`[match-ids] Timeout reached after ${maxDuration / 1000}s, stopping fetch`);
        break;
      }

      batchCount++;

      const params = new URLSearchParams({
        start: String(start),
        count: String(batchSize),
        startTime: String(startTimestamp),
        endTime: String(endTimestamp),
      });

      if (queue) params.set('queue', queue);
      if (type) params.set('type', type);

      const path = `/lol/match/v5/matches/by-puuid/${puuid}/ids?${params.toString()}`;
      console.log(`[match-ids] Fetching batch ${batchCount}/${maxBatches} (start=${start})`);

      try {
        const ids = await riotRequest(path, region);
        console.log(`[match-ids] Batch ${batchCount}: got ${ids.length} IDs`);

        if (ids.length === 0) {
          console.log(`[match-ids] No more matches found, stopping fetch`);
          break;
        }

        allMatchIds.push(...ids);

        // If we got fewer than requested, we've reached the end
        if (ids.length < batchSize) {
          console.log(`[match-ids] Received ${ids.length} < ${batchSize} matches, reached end`);
          break;
        }

        start += ids.length;

        // Safety check: if we've fetched a lot of matches, add a small delay
        if (allMatchIds.length > 1000) {
          console.log(`[match-ids] Fetched ${allMatchIds.length} matches, adding safety delay`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`[match-ids] Error fetching batch ${batchCount}:`, error);

        // If it's a rate limit or temporary error, we might want to continue
        // But for now, let's fail fast to avoid getting stuck
        if (batchCount === 1) {
          // If first batch fails, it's likely a permanent error
          throw error;
        } else {
          // If later batches fail, we might have partial data
          console.log(`[match-ids] Continuing with ${allMatchIds.length} matches after batch ${batchCount} failed`);
          break;
        }
      }
    }

    console.log(`[match-ids] Fetched ${batchCount} batches, total ${allMatchIds.length} match IDs in ${(Date.now() - startTime) / 1000}s`);

    const uniqueMatchIds = [...new Set(allMatchIds)];

    const result = {
      success: true,
      puuid,
      totalMatches: uniqueMatchIds.length,
      matches: uniqueMatchIds,
      matchIds: uniqueMatchIds, // Also include as matchIds for compatibility
      duplicatesRemoved: allMatchIds.length - uniqueMatchIds.length,
      cached: false,
      note: `Filtered by time range (2025-01-01 → now${queue ? `, queue=${queue}` : ''}${type ? `, type=${type}` : ''})`,
    };

    // Cache the results in shared cache with long TTL (1 hour) for recap session
    await cache.setLong(cacheKey, result);

    console.log(`[match-ids] Final: ${uniqueMatchIds.length} unique match IDs cached`);
    console.log(`[match-ids] All match IDs:`, uniqueMatchIds);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[match-ids] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch match history',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
