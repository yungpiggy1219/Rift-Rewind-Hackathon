'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Play, RotateCcw } from 'lucide-react';
import useSWR from 'swr';
import SummonerCard from '../../components/SummonerCard';

interface SummonerProfile {
  id: string;
  accountId: string;
  puuid: string;
  name: string;
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

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function HomePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const puuid = params.puuid as string;
  const playerName = searchParams.get('name') || 'Summoner';
  const tagLine = searchParams.get('tag') || '';
  const season = searchParams.get('season') || '2025';

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

  // Fetch summoner profile
  const { data: profile, error: profileError } = useSWR<SummonerProfile>(
    `/api/profile/${puuid}`,
    fetcher
  );

  // Fetch ranked info
  const { data: rankedInfo, error: rankedError } = useSWR<RankedInfo[]>(
    profile ? `/api/ranked/${profile.id}` : null,
    fetcher
  );

  const isLoading = !profile && !profileError;
  const hasError = profileError || rankedError;

  const startRecap = () => {
    router.push(`/recap/${puuid}?agent=velkoz&season=${season}&name=${encodeURIComponent(playerName)}&tag=${encodeURIComponent(tagLine)}`);
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
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-700/80 hover:to-pink-700/80 backdrop-blur-sm text-white rounded-lg transition-all duration-200 font-semibold text-lg"
          >
            <Play className="w-6 h-6" />
            Continue Anyway
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
      <div className="absolute bottom-8 right-8 z-10">
        <button
          onClick={startRecap}
          className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600/90 to-pink-600/90 hover:from-purple-700/90 hover:to-pink-700/90 backdrop-blur-sm text-white rounded-lg transition-all duration-200 font-semibold text-lg shadow-2xl border border-white/20"
        >
          <Play className="w-6 h-6" />
          Start Year-End Recap
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
              Welcome to Rift Rewind {season}
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
          </div>
        </div>
      </div>
    </div>
  );
}