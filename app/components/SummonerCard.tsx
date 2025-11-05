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
            <div className="flex items-center gap-4 text-gray-300 text-sm">
              <span>Level {profile?.summonerLevel ?? 'N/A'}</span>
              {rankedInfo?.[0] && (
                <span>
                  {rankedInfo[0].tier} {rankedInfo[0].rank} ({rankedInfo[0].leaguePoints} LP)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
