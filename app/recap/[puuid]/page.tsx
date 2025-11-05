'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { AgentId } from '@/src/lib/types';
import AgentPicker from '@/src/components/AgentPicker';
import RecapFlow from '@/src/components/RecapFlow';
import { ArrowLeft } from 'lucide-react';

export default function RecapPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const puuid = params.puuid as string;
  const [agentId, setAgentId] = useState<AgentId>((searchParams.get('agent') as AgentId) || 'velkoz');
  const [season, setSeason] = useState(searchParams.get('season') || '2025');
  const playerName = searchParams.get('name') || 'Summoner';
  const tagLine = searchParams.get('tag') || '';

  // Update URL when agent changes
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('agent', agentId);
    newSearchParams.set('season', season);
    router.replace(`/recap/${puuid}?${newSearchParams.toString()}`, { scroll: false });
  }, [agentId, season, puuid, router, searchParams]);

  const handleAgentChange = (newAgentId: AgentId) => {
    setAgentId(newAgentId);
  };

  const handleSeasonChange = (newSeason: string) => {
    setSeason(newSeason);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                New Recap
              </button>
              
              <div className="text-white">
                <span className="font-bold">{playerName}</span>
                {tagLine && <span className="text-gray-400">#{tagLine}</span>}
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Season Picker */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-400">Season</label>
                <select
                  value={season}
                  onChange={(e) => handleSeasonChange(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>

              {/* Agent Picker */}
              <div className="min-w-[200px]">
                <AgentPicker 
                  selectedAgent={agentId} 
                  onAgentChange={handleAgentChange} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recap Flow */}
      <RecapFlow 
        puuid={puuid}
        season={season}
        agentId={agentId}
        playerName={`${playerName}${tagLine ? `#${tagLine}` : ''}`}
      />
    </div>
  );
}