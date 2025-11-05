'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { AgentId } from '@/src/lib/types';
import { SCENE_ORDER } from '@/src/lib/sceneRegistry';
import AgentNarrator from './AgentNarrator';
import Viz from './Viz';
import ShareCardButton from './ShareCardButton';

interface RecapFlowProps {
  puuid: string;
  season: string;
  agentId: AgentId;
  playerName?: string;
}

const fetcher = (url: string, options?: RequestInit): Promise<unknown> => 
  fetch(url, options).then(res => res.json());

export default function RecapFlow({ puuid, season, agentId, playerName }: RecapFlowProps) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const currentSceneId = SCENE_ORDER[currentSceneIndex];

  // Fetch scene data
  const { data: sceneData, error: sceneError, isLoading: sceneLoading } = useSWR(
    currentSceneId ? `/api/insights/${currentSceneId}` : null,
    (url) => fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puuid, season })
    })
  );

  // Fetch narration
  const { data: narration, error: narrationError, isLoading: narrationLoading } = useSWR(
    sceneData ? `/api/narrate` : null,
    (url) => fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId,
        sceneId: currentSceneId,
        insight: sceneData.insight,
        playerName
      })
    })
  );

  const isLoading = sceneLoading || narrationLoading;
  const error = sceneError || narrationError;

  const goToNext = () => {
    if (currentSceneIndex < SCENE_ORDER.length - 1) {
      setCurrentSceneIndex(currentSceneIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex(currentSceneIndex - 1);
    }
  };

  const goToScene = (index: number) => {
    setCurrentSceneIndex(index);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error Loading Scene</h2>
          <p className="text-gray-300 mb-4">
            {error.message || 'Failed to load scene data'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Progress Bar */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white">
              Rift Rewind 2025 - {playerName}
            </h1>
            <div className="text-sm text-gray-300">
              Scene {currentSceneIndex + 1} of {SCENE_ORDER.length}
            </div>
          </div>
          
          {/* Scene Navigation */}
          <div className="flex gap-1 mb-4">
            {SCENE_ORDER.map((_, index) => (
              <button
                key={index}
                onClick={() => goToScene(index)}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  index === currentSceneIndex 
                    ? 'bg-blue-500' 
                    : index < currentSceneIndex 
                    ? 'bg-blue-700' 
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center">
            <button
              onClick={goToPrevious}
              disabled={currentSceneIndex === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-4">
              {sceneData && (
                <ShareCardButton 
                  sceneId={currentSceneId}
                  playerName={playerName}
                  sceneData={sceneData}
                />
              )}
            </div>

            <button
              onClick={goToNext}
              disabled={currentSceneIndex === SCENE_ORDER.length - 1}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Scene Content */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-300">Loading scene data...</p>
            </div>
          </div>
        ) : sceneData && narration ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Visualization */}
            <div className="space-y-6">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-4">
                  {sceneData.insight.summary}
                </h2>
                
                <Viz 
                  kind={sceneData.vizKind || 'highlight'} 
                  data={sceneData.insight.vizData} 
                />
                
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  {sceneData.insight.metrics.map((metric: { label: string; value: string | number; unit?: string; context?: string }, index: number) => (
                    <div key={index} className="bg-gray-700/50 rounded-lg p-3">
                      <div className="text-sm text-gray-400">{metric.label}</div>
                      <div className="text-lg font-bold text-white">
                        {metric.value}{metric.unit || ''}
                      </div>
                      {metric.context && (
                        <div className="text-xs text-gray-500">{metric.context}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Narration */}
            <div>
              <AgentNarrator narration={narration} agentId={agentId} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}