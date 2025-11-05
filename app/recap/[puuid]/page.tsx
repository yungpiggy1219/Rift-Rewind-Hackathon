'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { AgentId } from '@/src/lib/types';
import AgentPicker from '@/src/components/AgentPicker';
import RecapFlow from '@/src/components/RecapFlow';
import SummonerCard from '../../components/SummonerCard';
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
    <div className="relative min-h-screen bg-gray-900">

      {/* Recap Flow */}
      <RecapFlow 
        puuid={puuid}
        season={season}
        agentId={agentId}
        playerName={`${playerName}${tagLine ? `#${tagLine}` : ''}`}
      />

      {/* Top-right Summoner Card (below back button) */}
      <SummonerCard
        profile={undefined}
        playerName={playerName}
        tagLine={tagLine}
        rankedInfo={undefined}
        containerClassName="absolute top-20 left-8 z-20"
      />
    </div>
  );
}