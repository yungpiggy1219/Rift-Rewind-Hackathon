'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AgentId, ScenePayload, NarrationResponse } from '@/src/lib/types';
import { SCENE_ORDER } from '@/src/lib/sceneRegistry';
import AgentNarrator from './AgentNarrator';
import Viz from './Viz';
import ShareCardButton from './ShareCardButton';

interface RecapFlowProps {
  puuid: string;
  agentId: AgentId;
  playerName?: string;
}

const fetcher = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options);
  return response.json();
};

export default function RecapFlow({ puuid, agentId, playerName }: RecapFlowProps) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles] = useState(() => 
    Array.from({ length: 15 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 3
    }))
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const currentSceneId = SCENE_ORDER[currentSceneIndex];

  // Mouse tracking for tilt effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate mouse position relative to center (-1 to 1)
        const x = (e.clientX - centerX) / (rect.width / 2);
        const y = (e.clientY - centerY) / (rect.height / 2);
        
        setMousePosition({ x, y });
      }
    };

    const handleMouseLeave = () => {
      setMousePosition({ x: 0, y: 0 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Fetch scene data - use stable cache key to prevent refetching
  const sceneKey = currentSceneId ? `scene-${currentSceneId}-${puuid}` : null;

  const { data: sceneData, error: sceneError, isLoading: sceneLoading } = useSWR<ScenePayload>(
    sceneKey,
    async () => {
      console.log(`[RecapFlow] Fetching scene data: ${currentSceneId} - using cached data only`);
      return fetcher(`/api/insights/${currentSceneId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puuid })
      }) as Promise<ScenePayload>;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // Cache for 5 minutes
      shouldRetryOnError: false,
      revalidateIfStale: false,
    }
  );

  // Fetch narration - use stable cache key based on scene completion
  // Only fetch narration when we have scene data
  const narrationKey = sceneData && currentSceneId ? 
    `narration-${agentId}-${currentSceneId}-${puuid}-${playerName || 'unknown'}` : null;

  const { data: narration, error: narrationError, isLoading: narrationLoading } = useSWR<NarrationResponse>(
    narrationKey,
    async () => {
      console.log('[RecapFlow] Fetching narration:', agentId, currentSceneId);
      return fetcher('/api/narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          sceneId: currentSceneId,
          insight: sceneData?.insight,
          playerName: playerName || 'unknown'
        })
      }) as Promise<NarrationResponse>;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // Cache for 5 minutes
      shouldRetryOnError: false,
      revalidateIfStale: false,
    }
  );

  const isLoading = sceneLoading || narrationLoading;
  const error = sceneError || narrationError;

  const goToNext = () => {
    if (currentSceneIndex < SCENE_ORDER.length - 1) {
      setCurrentSceneIndex(currentSceneIndex + 1);
    } else {
      // On last scene, "Complete" button goes back to menu
      goBack();
    }
  };

  const goToPrevious = () => {
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex(currentSceneIndex - 1);
    }
  };

  const goBack = () => {
    router.push(`/menu/${puuid}?name=${encodeURIComponent(playerName || 'Summoner')}&tag=`);
  };

  // Calculate tilt values based on mouse position
  const tiltX = mousePosition.y * 3; // Subtle tilt up/down
  const tiltY = mousePosition.x * -3; // Subtle tilt left/right

  if (error) {
    return (
      <div 
        ref={containerRef}
        className="w-screen h-screen relative overflow-hidden"
      >
        {/* Background Image with Tilt Effect */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: 'url(/images/backgrounds/background_3.jpg)',
            backgroundSize: '120%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.1)`,
            transition: 'transform 0.15s ease-out',
            transformOrigin: 'center center'
          }}
        />
        
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-black/60 z-10"></div>
        
        {/* Error Content */}
        <div className="relative z-20 w-screen h-screen flex items-center justify-center">
          <div className="text-center bg-black/40 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Error Loading Scene</h2>
            <p className="text-gray-300 mb-6">
              {error.message || 'Failed to load scene data'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
              <button
                onClick={goBack}
                className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-screen h-screen relative overflow-hidden"
    >
      {/* Background Image with Tilt Effect */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: 'url(/images/backgrounds/background_3.jpg)',
          backgroundSize: '120%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.1)`,
          transition: 'transform 0.15s ease-out',
          transformOrigin: 'center center'
        }}
      />

      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/50 z-10"></div>

      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4">
        <div className="flex justify-between items-center">
          {/* Back Button - Top Left */}
          <button
            onClick={goBack}
            className="flex items-center gap-2 px-3 py-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-lg transition-all duration-200 border border-white/20 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* Share Button - Top Right */}
          <div>
            {sceneData && (
              <ShareCardButton 
                sceneId={currentSceneId}
                playerName={playerName}
                sceneData={sceneData}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area - Fixed Height Layout */}
      <div className="absolute inset-0 z-20 flex flex-col">
        {/* Top Spacer for Navigation */}
        <div className="h-20 flex-shrink-0"></div>
        
        {/* Scene Content - Takes remaining space */}
        <div className="flex-1 flex items-center justify-center px-4 overflow-hidden">
          {isLoading ? (
            <div className="text-center bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Loading Scene {currentSceneIndex + 1}</h3>
              <p className="text-gray-300 text-sm">Analyzing your League journey...</p>
            </div>
          ) : sceneData && narration ? (
            <div className="w-full h-full max-w-7xl mx-auto flex items-center">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full h-full max-h-[calc(100vh-200px)]">
                {/* Visualization Panel */}
                <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-white/20 flex flex-col overflow-hidden">
                  <h2 className="text-2xl font-bold text-white mb-4 flex-shrink-0">
                    {sceneData?.insight?.summary}
                  </h2>
                  
                  <div className="flex-1 mb-4 overflow-hidden">
                    <Viz 
                      kind={sceneData?.vizKind || 'highlight'} 
                      data={sceneData?.insight?.vizData} 
                    />
                  </div>
                  
                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                    {(sceneData?.insight?.metrics || []).slice(0, 4).map((metric: { label: string; value: string | number; unit?: string; context?: string }, index: number) => (
                      <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                        <div className="text-xs text-gray-300">{metric.label}</div>
                        <div className="text-lg font-bold text-white">
                          {metric.value}{metric.unit || ''}
                        </div>
                        {metric.context && (
                          <div className="text-xs text-gray-400 truncate">{metric.context}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Narration Panel */}
                <div className="flex flex-col overflow-hidden">
                  <div className="h-full overflow-hidden">
                    <AgentNarrator narration={narration} agentId={agentId} />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Bottom Spacer for Navigation */}
        <div className="h-20 flex-shrink-0"></div>
      </div>

      {/* Bottom Navigation - Fixed Position */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-4">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          {/* Previous Button */}
          <button
            onClick={goToPrevious}
            disabled={currentSceneIndex === 0}
            className="flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-black/60 disabled:bg-black/20 disabled:text-gray-500 backdrop-blur-sm text-white rounded-lg transition-all duration-200 border border-white/20 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {/* Scene Counter */}
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {currentSceneIndex + 1} / {SCENE_ORDER.length}
              </div>
              <div className="text-xs text-gray-300 max-w-32 truncate">
                {SCENE_ORDER[currentSceneIndex]?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            </div>
          </div>

          {/* Next/Complete Button */}
          <button
            onClick={goToNext}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-700/80 hover:to-pink-700/80 backdrop-blur-sm text-white rounded-lg transition-all duration-200 border border-white/20 text-sm"
          >
            {currentSceneIndex === SCENE_ORDER.length - 1 ? 'Back to Menu' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Particles Effect */}
      <div className="absolute inset-0 pointer-events-none z-15">
        {particles.map((particle, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}