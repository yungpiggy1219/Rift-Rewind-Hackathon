'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { AgentId } from '@/src/lib/types';
import AgentPicker from '@/src/components/AgentPicker';
import RecapFlow from '@/src/components/RecapFlow';
import SummonerCard from '../../components/SummonerCard';
import { ArrowLeft } from 'lucide-react';
import useSWR from 'swr';

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

export default function RecapPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const puuid = params.puuid as string;
  const [agentId, setAgentId] = useState<AgentId>((searchParams.get('agent') as AgentId) || 'velkoz');
  const playerName = searchParams.get('name') || 'Summoner';
  const tagLine = searchParams.get('tag') || '';

  // Fetch summoner profile
  const { data: profile } = useSWR<SummonerProfile>(
    `/api/profile/${puuid}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache for 60 seconds
    }
  );

  // Fetch ranked info (using PUUID, not summonerId)
  const { data: rankedInfo } = useSWR<RankedInfo[]>(
    puuid ? `/api/ranked/${puuid}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache for 60 seconds
    }
  );

  // Update URL when agent changes
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('agent', agentId);
    router.replace(`/recap/${puuid}?${newSearchParams.toString()}`, { scroll: false });
  }, [agentId, puuid, router, searchParams]);

  const handleAgentChange = (newAgentId: AgentId) => {
    setAgentId(newAgentId);
  };

  return (
    <div className="relative min-h-screen bg-gray-900">

      {/* Recap Flow */}
      <RecapFlow 
        puuid={puuid}
        agentId={agentId}
        playerName={`${playerName}${tagLine ? `#${tagLine}` : ''}`}
      />

      {/* Top-left Summoner Card (below back button) */}
      <SummonerCard
        profile={profile}
        playerName={playerName}
        tagLine={tagLine}
        rankedInfo={rankedInfo}
        containerClassName="absolute top-20 left-8 z-20"
      />
    </div>
  );
}