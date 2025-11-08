'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Play, RotateCcw } from 'lucide-react';
import useSWR from 'swr';
import SummonerCard from '../../components/SummonerCard';
import MatchCard from '../../components/MatchCard';
import DialogueBubble from '../../components/DialogueBubble';
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
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Sound effect refs
  const spawnSfxRef = useRef<HTMLAudioElement | null>(null);
  const clickSfxRef = useRef<HTMLAudioElement | null>(null);
  const smiteSfxRef = useRef<HTMLAudioElement | null>(null);
  const teleportSfxRef = useRef<HTMLAudioElement | null>(null);

  // Vel'Koz narration state (can be string or array of strings)
  const [velkozNarration, setVelkozNarration] = useState<string | string[]>([
    'Greetings, summoner.',
    'I am Vel\'Koz, the Eye of the Void.',
    'I shall analyze your performance this year.',
    'Click to continue...'
  ]);
  
  // State to show start button after intro completes
  const [showStartButton, setShowStartButton] = useState(false);
  
  // Function to change Vel'Koz narration
  const updateVelkozNarration = (newText: string | string[]) => {
    setVelkozNarration(newText);
  };

  // Initialize sound effects and play spawn sound on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Create audio elements
      spawnSfxRef.current = new Audio('/sfx/spawn.mp3');
      clickSfxRef.current = new Audio('/sfx/pm.mp3');
      smiteSfxRef.current = new Audio('/sfx/smite.mp3');
      teleportSfxRef.current = new Audio('/sfx/teleport.mp3');

      // Play spawn sound when menu loads
      spawnSfxRef.current.play().catch((error) => {
        console.log('Spawn sound autoplay prevented:', error);
      });
    }

    return () => {
      // Cleanup audio elements
      if (spawnSfxRef.current) spawnSfxRef.current.pause();
      if (clickSfxRef.current) clickSfxRef.current.pause();
      if (smiteSfxRef.current) smiteSfxRef.current.pause();
      if (teleportSfxRef.current) teleportSfxRef.current.pause();
    };
  }, []);

  // Function to play dialogue click sound
  const playDialogueClickSound = () => {
    if (clickSfxRef.current) {
      clickSfxRef.current.currentTime = 0; // Reset to start
      clickSfxRef.current.play().catch((error) => {
        console.log('Click sound failed:', error);
      });
    }
  };

  // Clear cache function
  const clearCache = async () => {
    setIsClearingCache(true);
    updateVelkozNarration([
      'Initiating data purge.',
      'All cached knowledge will be obliterated.',
      'Stand by...'
    ]);
    
    try {
      console.log('[Menu] Clearing cache for PUUID:', puuid);
      const response = await fetch(`/api/clear-cache?puuid=${puuid}`);
      if (response.ok) {
        const data = await response.json();
        console.log('[Menu] Cache cleared:', data);
        
        updateVelkozNarration([
          'Cache purge complete.',
          `${data.totalCleared || 0} entries have been disintegrated.`,
          'Your data will be fresh on the next analysis.'
        ]);
        
        // Show detailed success message
        const message = `✓ Successfully cleared ${data.totalCleared || 0} cache entries!\n\n` +
                       `This includes:\n` +
                       `• All scene computations (damage stats, healing, gold, etc.)\n` +
                       `• Match data caches\n` +
                       `• Narration caches\n\n` +
                       `Your data will be fresh on the next recap!`;
        
        alert(message);
        
        // Optionally reload the page to clear client-side SWR cache
        if (confirm('Would you like to reload the page to clear client-side cache too?')) {
          window.location.reload();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear cache');
      }
    } catch (error) {
      console.error('[Menu] Error clearing cache:', error);
      alert(`Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check the console for details.`);
    } finally {
      setIsClearingCache(false);
    }
  };

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

  // Update Vel'Koz narration when profile loads
  useEffect(() => {
    if (profile && !isPreloading) {
      updateVelkozNarration([
        `Fascinating.`,
        `Summoner ${profile.name}, Level ${profile.summonerLevel}.`,
        `The data compilation is complete.`,
        `Shall we proceed with the analysis?`
      ]);
      // Don't show button again after profile loads, only after initial intro
      // Button state is preserved from initial intro completion
    }
  }, [profile, isPreloading]);

  // Wrapper for startRecap that updates Vel'Koz narration
  const handleStartRecap = () => {
    // Hide the button when starting
    setShowStartButton(false);
    
    // Play smite sound immediately
    if (smiteSfxRef.current) {
      smiteSfxRef.current.play().catch((error) => {
        console.log('Smite sound failed:', error);
      });
    }
    
    // Play teleport sound 2 seconds after smite
    setTimeout(() => {
      if (teleportSfxRef.current) {
        teleportSfxRef.current.play().catch((error) => {
          console.log('Teleport sound failed:', error);
        });
      }
    }, 2000);
    
    updateVelkozNarration([
      'Initiating comprehensive analysis.',
      'Knowledge through disintegration...',
      'Prepare yourself, summoner.'
    ]);
    // Wait a moment for the narration, then start preloading
    setTimeout(() => {
      startRecap();
    }, 2000);
  };

  const startRecap = async () => {
    setIsPreloading(true);
    setPreloadStatus('Fetching match list...');
    
    try {
      // Step 1: Get all match IDs
      const matchIdsResponse = await fetch(`/api/match-ids?puuid=${puuid}`);
      if (!matchIdsResponse.ok) {
        throw new Error('Failed to fetch match IDs');
      }
      
      const matchIdsData = await matchIdsResponse.json();
      const matchIds: string[] = matchIdsData.matchIds || [];
      
      if (matchIds.length === 0) {
        setPreloadStatus('No matches found for 2025. Continuing anyway...');
        setTimeout(() => {
          router.push(`/recap/${puuid}?agent=velkoz&name=${encodeURIComponent(playerName)}&tag=${encodeURIComponent(tagLine)}`);
        }, 1500);
        return;
      }
      
      console.log(`[Menu] Found ${matchIds.length} total matches to process`);
      
      // Step 2: Fetch all match details in batches
      setPreloadStatus(`Found ${matchIds.length} matches. Loading match details...`);
      
      const batchSize = 100; // Reduced batch size to avoid rate limiting
      let processedCount = 0;
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < matchIds.length; i += batchSize) {
        const batch = matchIds.slice(i, i + batchSize);
        const batchEnd = Math.min(i + batchSize, matchIds.length);
        
        setPreloadStatus(`Loading matches ${i + 1}-${batchEnd} of ${matchIds.length}... (${successCount} success, ${failCount} failed)`);
        
        // Fetch matches in parallel within the batch
        const batchPromises = batch.map(async (matchId) => {
          try {
            console.log(`[Menu] Fetching match ${matchId}`);
            const response = await fetch(`/api/matches/${matchId}`);
            
            if (response.ok) {
              const matchData = await response.json();
              console.log(`[Menu] ✓ Successfully cached match ${matchId}`);
              return { success: true, matchId };
            } else {
              let errorMessage = `HTTP ${response.status} ${response.statusText}`;
              try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
                console.error(`[Menu] ✗ Failed to fetch match ${matchId}:`, {
                  status: response.status,
                  statusText: response.statusText,
                  error: errorData
                });
              } catch (parseError) {
                const errorText = await response.text();
                console.error(`[Menu] ✗ Failed to fetch match ${matchId}:`, {
                  status: response.status,
                  statusText: response.statusText,
                  body: errorText
                });
              }
              return { success: false, matchId, error: errorMessage };
            }
          } catch (error) {
            console.error(`[Menu] ✗ Exception while fetching match ${matchId}:`, {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
            });
            return { success: false, matchId, error: error instanceof Error ? error.message : String(error) };
          }
        });
        
        const results = await Promise.all(batchPromises);
        
        // Count successes and failures
        results.forEach(result => {
          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }
        });
        
        processedCount += results.length;
        
        // Small delay between batches to avoid overwhelming the API (respect rate limits)
        if (i + batchSize < matchIds.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      console.log(`[Menu] Finished processing ${processedCount} matches: ${successCount} success, ${failCount} failed`);
      
      if (successCount === 0) {
        setPreloadStatus('Failed to load match data. Check your API key and try again.');
        setTimeout(() => {
          setIsPreloading(false);
        }, 3000);
        return;
      }
      
      setPreloadStatus(`Loaded ${successCount}/${matchIds.length} matches. Starting recap...`);
      
      // Step 3: Navigate to recap after caching is complete
      setTimeout(() => {
        router.push(`/recap/${puuid}?agent=velkoz&name=${encodeURIComponent(playerName)}&tag=${encodeURIComponent(tagLine)}`);
      }, 1000);
      
    } catch (error) {
      console.error('Error preloading match data:', error);
      setPreloadStatus('Error loading matches. Continuing anyway...');
      
      // Navigate anyway after a short delay
      setTimeout(() => {
        router.push(`/recap/${puuid}?agent=velkoz&name=${encodeURIComponent(playerName)}&tag=${encodeURIComponent(tagLine)}`);
      }, 2000);
    }
  };

  if (isLoading) {
    return (
      <div 
        className="w-screen h-screen flex items-center justify-center relative"
        style={{
          backgroundImage: 'url(/images/backgrounds/background_menu.jpg)',
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
          backgroundImage: 'url(/images/backgrounds/background_menu.jpg)',
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
        backgroundImage: 'url(/images/backgrounds/background_menu.jpg)',
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

      {/* Bottom Left - Clear Cache Button */}
      <div className="absolute bottom-8 left-8 z-10">
        <button
          onClick={clearCache}
          disabled={isClearingCache || isPreloading}
          className="flex items-center justify-center gap-2 px-6 py-2 bg-gray-700/80 hover:bg-gray-600/80 disabled:bg-gray-800/50 backdrop-blur-sm text-white rounded-lg transition-all duration-200 font-medium text-sm border border-white/20"
        >
          {isClearingCache ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              Clearing Cache...
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4" />
              Clear Cache & Refresh Data
            </>
          )}
        </button>
      </div>

      {/* Bottom Right - Vel'Koz Agent & Start Recap Button */}
      <div className="absolute bottom-0 right-0 z-10 flex items-end gap-6">
        {/* Vel'Koz Agent Image - positioned lower and cropped right/bottom */}
        <div className="relative group overflow-hidden" style={{ marginBottom: '-10vh', marginRight: '-5vw' }}>
          <div className="absolute inset-20 bg-purple-500/20 rounded-full blur-xl group-hover:bg-purple-500/30 transition-all duration-300"></div>
          <img 
            src="/images/ai-agents/velkoz.png"
            alt="Vel'Koz - The Eye of the Void"
            className="relative h-[70vh] w-auto object-contain drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Dialogue Bubble */}
          <div className="absolute top-8 right-120">
            <DialogueBubble 
              text={velkozNarration}
              typingSpeed={40}
              onAdvance={playDialogueClickSound}
              onComplete={() => {
                // Show start button after opening intro completes
                console.log('Vel\'Koz finished speaking');
                setShowStartButton(true);
              }}
            />
          </div>
        </div>

        {/* Buttons Column */}
{/*         <div className="space-y-4 mb-8 mr-8">
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
        </div> */}
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
{/*       <div className="absolute inset-0 flex items-center justify-center z-5">
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
      </div> */}

      {/* Center Start Button - appears after intro, centered on entire screen */}
      {showStartButton && !isPreloading && (
        <div className="fixed inset-0 flex items-center justify-center z-30 pointer-events-none">
          <button
            onClick={handleStartRecap}
            className="group relative transition-all duration-300 hover:scale-105 active:scale-95 pointer-events-auto"
          >
            <img 
              src="/images/ui/start_recep.png"
              alt="Start Year-End Recap"
              className="w-64 h-auto drop-shadow-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
          </button>
        </div>
      )}
    </div>
  );
}