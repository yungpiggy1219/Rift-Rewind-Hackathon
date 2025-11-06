'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Play, RotateCcw } from 'lucide-react';
import useSWR from 'swr';
import SummonerCard from '../../components/SummonerCard';
import MatchCard from '../../components/MatchCard';
import { getChampionName } from '../../../src/lib/champions';
import { MatchData } from '@/src/lib/types';

interface SummonerProfile {
  id: string;
  accountId: string;
  puuid: string;
  name: string;
  tagLine?: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

interface RankedInfo {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

interface ChampionMastery {
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
  championPointsSinceLastLevel: number;
  championPointsUntilNextLevel: number;
  chestGranted: boolean;
  tokensEarned: number;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function HomePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const puuid = params.puuid as string;
  const playerName = searchParams.get('name') || 'Summoner';
  const tagLine = searchParams.get('tag') || '';

  // Preloading state
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadStatus, setPreloadStatus] = useState('');

  // Force landscape orientation on mobile
  useEffect(() => {
    const handleOrientationChange = () => {
      if (window.innerHeight > window.innerWidth && window.innerWidth < 768) {
        // Mobile device in portrait mode - show rotation hint
        const rotationHint = document.getElementById('rotation-hint');
        if (rotationHint) {
          rotationHint.style.display = 'flex';
        }
      } else {
        // Desktop or landscape mobile - hide rotation hint
        const rotationHint = document.getElementById('rotation-hint');
        if (rotationHint) {
          rotationHint.style.display = 'none';
        }
      }
    };

    handleOrientationChange();
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // Fetch summoner profile (from cache)
  const { data: profile, error: profileError } = useSWR<SummonerProfile>(
    puuid ? `/api/profile/${puuid}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache for 60 seconds
      shouldRetryOnError: false, // Don't retry on error
      onSuccess: (data) => {
        console.log('[Menu] Profile fetched successfully:', data);
      },
      onError: (err) => {
        console.error('[Menu] Profile fetch error:', err);
      }
    }
  );

  // Fetch ranked info (uses cached account for platform)
  const { data: rankedInfo, error: rankedError } = useSWR<RankedInfo[]>(
    puuid ? `/api/ranked/${puuid}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache for 60 seconds
      shouldRetryOnError: false, // Don't retry on error
    }
  );

  // Fetch champion mastery (uses cached account for platform)
  const { data: masteryData, error: masteryError } = useSWR<ChampionMastery[]>(
    puuid ? `/api/mastery/${puuid}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache for 60 seconds
      shouldRetryOnError: false, // Don't retry on error
    }
  );

  // Fetch match IDs (uses cached account for region)
  const { data: matchIdsData } = useSWR<{ totalMatches: number; matchIds: string[] }>(
    puuid ? `/api/match-ids?puuid=${puuid}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 6000000000000000, // Cache for 60 seconds
      shouldRetryOnError: false, // Don't retry on error
    }
  );

  // Fetch most recent match details
  const mostRecentMatchId = matchIdsData?.matchIds?.[0];
  const { data: recentMatch } = useSWR<MatchData>(
    mostRecentMatchId ? `/api/matches/${mostRecentMatchId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000, // Cache for 1 hour
      shouldRetryOnError: false,
    }
  );

  const isLoading = !profile && !profileError;
  const hasError = profileError || rankedError;

  const startRecap = async () => {
    setIsPreloading(true);
    setPreloadStatus('Checking cached data...');
    
    try {
      // Step 1: Get all match IDs
      const matchIdsResponse = await fetch(`/api/match-ids?puuid=${puuid}`);
      const matchIdsData = await matchIdsResponse.json();
      const matchIds: string[] = matchIdsData.matchIds || [];
      
      console.log(`[Menu] Found ${matchIds.length} total matches to cache`);
      
      // Step 2: Check if we already have cached data by testing a few random matches
      const sampleSize = Math.min(5, matchIds.length);
      const sampleMatches = matchIds.slice(0, sampleSize);
      
      setPreloadStatus('Checking existing cache...');
      let alreadyCachedCount = 0;
      
      for (const matchId of sampleMatches) {
        try {
          const response = await fetch(`/api/matches/${matchId}`, { 
            method: 'GET',
            cache: 'force-cache' // Try to get from cache only
          });
          if (response.ok) {
            alreadyCachedCount++;
          }
        } catch {
          // Not cached
        }
      }
      
      const cacheRatio = alreadyCachedCount / sampleSize;
      
      if (cacheRatio >= 0.8) {
        // Most data is already cached, skip caching
        console.log(`[Menu] Data already cached (${Math.round(cacheRatio * 100)}% cache hit rate)`);
        setPreloadStatus(`Data already cached. Loading recap...`);
        
        setTimeout(() => {
          router.push(`/recap/${puuid}?agent=velkoz&name=${encodeURIComponent(playerName)}&tag=${encodeURIComponent(tagLine)}`);
        }, 500);
        return;
      }
      
      // Step 3: Cache missing data
      setPreloadStatus(`Found ${matchIds.length} matches. Caching match details...`);
      
      const batchSize = 10;
      let cachedCount = 0;
      
      for (let i = 0; i < matchIds.length; i += batchSize) {
        const batch = matchIds.slice(i, i + batchSize);
        setPreloadStatus(`Caching matches ${cachedCount + 1}-${Math.min(cachedCount + batchSize, matchIds.length)} of ${matchIds.length}...`);
        
        const batchPromises = batch.map(async (matchId) => {
          try {
            const response = await fetch(`/api/matches/${matchId}`);
            if (response.ok) {
              await response.json(); // This will cache the match data
              return true;
            }
            return false;
          } catch (error) {
            console.warn(`Failed to cache match ${matchId}:`, error);
            return false;
          }
        });
        
        const results = await Promise.all(batchPromises);
        cachedCount += results.filter(Boolean).length;
        
        // Small delay between batches to avoid overwhelming the API
        if (i + batchSize < matchIds.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log(`[Menu] Successfully cached ${cachedCount} out of ${matchIds.length} matches`);
      setPreloadStatus(`Cached ${cachedCount} matches. Loading recap...`);
      
      // Step 4: Navigate to recap after caching is complete
      setTimeout(() => {
        router.push(`/recap/${puuid}?agent=velkoz&name=${encodeURIComponent(playerName)}&tag=${encodeURIComponent(tagLine)}`);
      }, 500);
      
    } catch (error) {
      console.error('Error preloading match data:', error);
      setPreloadStatus('Error loading matches. Continuing anyway...');
      
      // Navigate anyway after a short delay
      setTimeout(() => {
        router.push(`/recap/${puuid}?agent=velkoz&name=${encodeURIComponent(playerName)}&tag=${encodeURIComponent(tagLine)}`);
      }, 1000);
    }
  };

  if (isLoading) {
    return (
      <div 
        className="w-screen h-screen flex items-center justify-center relative"
        style={{
          backgroundImage: 'url(/images/background_1.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative z-10 text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-8"></div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Loading your profile...
          </h2>
          <p className="text-blue-200">
            Fetching summoner data and match history
          </p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div 
        className="w-screen h-screen flex items-center justify-center relative"
        style={{
          backgroundImage: 'url(/images/background_1.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        
        {/* Top Left - Error State */}
        <div className="absolute top-8 left-8 z-10">
          <div className="bg-red-900/80 backdrop-blur-sm border border-red-700/50 rounded-lg p-4">
            <h3 className="text-lg font-bold text-red-400 mb-2">Profile Error</h3>
            <p className="text-gray-300 text-sm">
              {profileError?.message || 'Unable to load summoner data'}
            </p>
          </div>
        </div>

        {/* Bottom Right - Continue Button */}
        <div className="absolute bottom-8 right-8 z-10 space-y-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600/80 hover:bg-blue-700/80 backdrop-blur-sm text-white rounded-lg transition-all duration-200 font-semibold"
          >
            <RotateCcw className="w-5 h-5" />
            Try Different Summoner
          </button>
          <button
            onClick={startRecap}
            disabled={isPreloading}
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-700/80 hover:to-pink-700/80 disabled:from-gray-600/80 disabled:to-gray-700/80 backdrop-blur-sm text-white rounded-lg transition-all duration-200 font-semibold text-lg"
          >
            {isPreloading ? (
              <>
                <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
                Continue Anyway
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Continue Anyway
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-screen h-screen relative overflow-hidden"
      style={{
        backgroundImage: 'url(/images/background_1.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Top Left - Summoner Info (reusable component) */}
      <SummonerCard
        profile={profile}
        playerName={playerName}
        tagLine={tagLine}
        rankedInfo={rankedInfo}
        containerClassName="absolute top-8 left-8 z-10"
      />

      {/* Bottom Right - Start Recap Button */}
      <div className="absolute bottom-8 right-8 z-10 space-y-4">
        {isPreloading && preloadStatus && (
          <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 border border-white/20 max-w-xs">
            <div className="text-sm text-white font-medium">{preloadStatus}</div>
          </div>
        )}
        <button
          onClick={startRecap}
          disabled={isPreloading}
          className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600/90 to-pink-600/90 hover:from-purple-700/90 hover:to-pink-700/90 disabled:from-gray-600/90 disabled:to-gray-700/90 backdrop-blur-sm text-white rounded-lg transition-all duration-200 font-semibold text-lg shadow-2xl border border-white/20"
        >
          {isPreloading ? (
            <>
              <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
              Preparing Recap...
            </>
          ) : (
            <>
              <Play className="w-6 h-6" />
              Start Year-End Recap
            </>
          )}
        </button>
      </div>

      {/* Mobile Orientation Hint */}
      <div 
        id="rotation-hint"
        className="md:hidden fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
        style={{ display: 'none' }}
      >
        <div className="text-center p-8">
          <RotateCcw className="w-16 h-16 text-white mx-auto mb-6 animate-pulse" />
          <h3 className="text-2xl font-bold text-white mb-4">Rotate Your Device</h3>
          <p className="text-gray-300 text-lg mb-6">
            For the best Rift Rewind experience, please rotate your device to landscape mode
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-8 bg-white/20 rounded border-2 border-white/40"></div>
            <RotateCcw className="w-6 h-6 text-white" />
            <div className="w-8 h-12 bg-white/20 rounded border-2 border-white/40"></div>
          </div>
        </div>
      </div>

      {/* Center Content - Welcome Message */}
      <div className="absolute inset-0 flex items-center justify-center z-5">
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-white/10 max-w-2xl mx-4">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              Welcome to Rift Rewind 2025
            </h2>
            <p className="text-xl text-gray-200 mb-6">
              Your personalized League of Legends year-end recap awaits
            </p>
            
            {rankedInfo?.[0] && (
              <div className="grid grid-cols-3 gap-6 mt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">
                    {rankedInfo[0].wins + rankedInfo[0].losses}
                  </div>
                  <div className="text-sm text-gray-300">Ranked Games</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">
                    {Math.round((rankedInfo[0].wins / (rankedInfo[0].wins + rankedInfo[0].losses)) * 100)}%
                  </div>
                  <div className="text-sm text-gray-300">Win Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400">
                    {rankedInfo[0].leaguePoints}
                  </div>
                  <div className="text-sm text-gray-300">League Points</div>
                </div>
              </div>
            )}

            {masteryData && masteryData.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Top Champion Mastery</h3>
                <div className="grid grid-cols-3 gap-4">
                  {masteryData.slice(0, 3).map((mastery) => (
                    <div key={mastery.championId} className="text-center">
                      <div className="text-2xl font-bold text-purple-400">
                        {getChampionName(mastery.championId)}
                      </div>
                      <div className="text-sm text-gray-300">Level {mastery.championLevel}</div>
                      <div className="text-xs text-gray-400">
                        {mastery.championPoints.toLocaleString()} pts
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {matchIdsData && (
              <div className="mt-8">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Most Recent Match</h3>
                {recentMatch && puuid ? (
                  <MatchCard match={recentMatch} playerPuuid={puuid} />
                ) : (
                  <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                    <div className="text-center mb-3">
                      <div className="text-3xl font-bold text-cyan-400">
                        {matchIdsData.totalMatches}
                      </div>
                      <div className="text-sm text-gray-300">Total Matches in 2025</div>
                    </div>
                    {matchIdsData.matchIds && matchIdsData.matchIds.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="text-xs text-gray-400 mb-2">Loading match details...</div>
                        <div className="animate-pulse bg-gray-700/50 h-20 rounded"></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}