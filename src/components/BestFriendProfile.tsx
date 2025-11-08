'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ProfileData {
  id?: string;
  name?: string;
  tagLine?: string;
  profileIconId?: number;
  summonerLevel?: number;
  tier?: string;
  rank?: string;
  leaguePoints?: number;
  wins?: number;
  losses?: number;
}

interface RankedData {
  queueType?: string;
  tier?: string;
  rank?: string;
  leaguePoints?: number;
  wins?: number;
  losses?: number;
}

interface BestFriendProfileProps {
  puuid: string;
  stats?: Array<{
    label: string;
    value: string | number;
    color?: string;
  }>;
  recentGames?: Array<{
    date: string;
    won: boolean;
    championName: string;
  }>;
}

export default function BestFriendProfile({
  puuid,
  stats = [],
  recentGames = []
}: BestFriendProfileProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [rankedData, setRankedData] = useState<RankedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        
        // Fetch summoner profile by PUUID
        const profileResponse = await fetch(`/api/profile/${puuid}`);
        if (!profileResponse.ok) {
          throw new Error('Failed to fetch profile');
        }
        const profileData = await profileResponse.json();
        setProfile(profileData);

        // Fetch ranked stats by PUUID
        const rankedResponse = await fetch(`/api/ranked/${puuid}`);
        if (rankedResponse.ok) {
          const rankedDataArray = await rankedResponse.json();
          // Find RANKED_SOLO_5x5 queue type, otherwise use first available
          const soloRanked = Array.isArray(rankedDataArray) 
            ? rankedDataArray.find((entry: RankedData) => entry.queueType === 'RANKED_SOLO_5x5') || rankedDataArray[0]
            : rankedDataArray;
          setRankedData(soloRanked);
        }
      } catch (err) {
        console.error('Error fetching best friend profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (puuid) {
      fetchProfileData();
    }
  }, [puuid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          <p className="text-gray-400">Loading ally profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-linear-to-br from-red-900/30 to-orange-900/30 border border-red-700/50 rounded-xl p-8">
        <div className="text-center">
          <div className="text-3xl font-bold text-red-400 mb-2">Error</div>
          <div className="text-gray-300">{error || 'Unable to load ally profile'}</div>
        </div>
      </div>
    );
  }

  const displayName = profile.name || 'Unknown';
  const displayTag = profile.tagLine || '';
  const displayLevel = profile.summonerLevel || 'N/A';
  
  // Get ranked stats from rankedData (fetched from League API)
  const rankedTier = rankedData?.tier || profile.tier || 'Unranked';
  const rankedRank = rankedData?.rank || profile.rank || '';
  const rankedLP = rankedData?.leaguePoints || profile.leaguePoints || 0;
  const rankedWins = rankedData?.wins || profile.wins || 0;
  const rankedLosses = rankedData?.losses || profile.losses || 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Profile Card */}
      <div className="bg-linear-to-br from-purple-900/30 to-blue-900/30 border border-purple-700/50 rounded-xl p-8">
        <div className="flex items-center gap-6 mb-6">
          {/* Profile Icon */}
          <div className="w-24 h-24 bg-linear-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0">
            {profile.profileIconId ? (
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/profileicon/${profile.profileIconId}.png`}
                alt={displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-4xl font-bold text-white">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <h2 className="text-4xl font-bold text-white mb-2 font-friz">
              {displayName}
              {displayTag && <span className="text-gray-400 text-xl">#{displayTag}</span>}
            </h2>
            <div className="text-gray-300 space-y-1">
              <div>Summoner Level: <span className="text-purple-300 font-semibold">{displayLevel}</span></div>
              {rankedTier && rankedTier !== 'Unranked' && (
                <div>
                  Rank: <span className="text-cyan-300 font-semibold">
                    {rankedTier} {rankedRank} {rankedLP > 0 && `(${rankedLP} LP)`}
                  </span>
                </div>
              )}
              {rankedWins > 0 || rankedLosses > 0 ? (
                <div>
                  Ranked Record: <span className="text-green-300 font-semibold">
                    {rankedWins}W-{rankedLosses}L
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-black/30 rounded-lg p-4 text-center">
                <div 
                  className="text-3xl font-bold mb-2 font-friz"
                  style={{ color: stat.color || '#fff' }}
                >
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Games */}
      {recentGames.length > 0 && (
        <div className="bg-linear-to-br from-blue-900/30 to-cyan-900/30 border border-blue-700/50 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 font-friz">Recent Games Together</h3>
          <div className="space-y-3">
            {recentGames.slice(0, 5).map((game, idx) => (
              <div 
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  game.won 
                    ? 'bg-green-900/20 border-green-700/50' 
                    : 'bg-red-900/20 border-red-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${game.won ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <div className="text-sm font-semibold text-white">{game.championName}</div>
                    <div className="text-xs text-gray-400">{game.date}</div>
                  </div>
                </div>
                <div className={`font-semibold ${game.won ? 'text-green-400' : 'text-red-400'}`}>
                  {game.won ? 'VICTORY' : 'DEFEAT'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
