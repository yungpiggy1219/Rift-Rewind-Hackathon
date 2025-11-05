"use client";

import React from 'react';

interface Profile {
  profileIconId?: number;
  summonerLevel?: number;
}

interface RankedInfo {
  queueType?: string;
  tier?: string;
  rank?: string;
  leaguePoints?: number;
  wins?: number;
  losses?: number;
}

interface Props {
  profile?: Profile | null;
  playerName: string;
  tagLine?: string | null;
  rankedInfo?: RankedInfo[] | null;
  containerClassName?: string; // allows positioning (e.g., 'absolute top-8 left-8')
}

export default function SummonerCard({
  profile,
  playerName,
  tagLine,
  rankedInfo,
  containerClassName = 'absolute top-8 left-8 z-10'
}: Props) {
  const getQueueDisplay = (queueType?: string) => {
    if (!queueType) return 'RANKED';
    if (queueType.includes('SOLO')) return 'Solo/Duo';
    if (queueType.includes('FLEX')) return 'Flex';
    return 'RANKED';
  };

  return (
    <div className={containerClassName}>
      <div className="bg-black/60 backdrop-blur-sm rounded-lg p-6 border border-white/20">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            {profile?.profileIconId ? (
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${profile.profileIconId}.png`}
                alt="Profile Icon"
                className="w-14 h-14 rounded-full"
              />
            ) : (
              <span className="text-white font-bold text-xl">
                {playerName?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              {playerName}
              {tagLine && <span className="text-gray-300">#{tagLine}</span>}
            </h1>
            <div className="text-gray-300 text-sm">
              <div>Level {profile?.summonerLevel ?? 'N/A'}</div>
              {rankedInfo && rankedInfo.length > 0 ? (
                rankedInfo.map((rank, index) => (
                  <div key={rank.queueType || index}>
                    {getQueueDisplay(rank.queueType)}: {rank.tier ? rank.tier.charAt(0).toUpperCase() + rank.tier.slice(1).toLowerCase() : 'Unranked'} {rank.rank} ({rank.leaguePoints} LP)
                  </div>
                ))
              ) : (
                <div>UNRANKED</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
