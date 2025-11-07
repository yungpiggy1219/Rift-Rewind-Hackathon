"use client";

import React, { useState } from 'react';
import { ChevronDown, Home, ArrowLeft } from 'lucide-react';

interface Profile {
  id?: string;
  accountId?: string;
  puuid?: string;
  name?: string;
  tagLine?: string;
  profileIconId?: number;
  revisionDate?: number;
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
  playerName?: string;
  tagLine?: string | null;
  rankedInfo?: RankedInfo[] | null;
  containerClassName?: string; // allows positioning (e.g., 'absolute top-8 left-8')
  onBackToMenu?: () => void; // Callback for back to menu action
  showMenuButton?: boolean; // Whether to show the menu dropdown
}

export default function SummonerCard({
  profile,
  playerName,
  tagLine,
  rankedInfo,
  containerClassName = 'absolute top-8 left-8 z-10',
  onBackToMenu,
  showMenuButton = false
}: Props) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const getQueueDisplay = (queueType?: string) => {
    if (!queueType) return 'RANKED';
    if (queueType.includes('SOLO')) return 'Solo/Duo';
    if (queueType.includes('FLEX')) return 'Flex';
    return 'RANKED';
  };

  // Use profile name if available, otherwise use playerName
  const displayName = profile?.name || playerName || 'Summoner';
  const displayTag = profile?.tagLine || tagLine;
  const displayLevel = profile?.summonerLevel ?? 'N/A';

  // Debug logging
  console.log('[SummonerCard] Rendering with:', {
    profile,
    playerName,
    tagLine,
    displayName,
    displayTag,
    displayLevel
  });

  return (
    <div className={containerClassName}>
      {/* Compact card with smaller padding and border */}
      <div className="bg-black/60 backdrop-blur-sm rounded-md sm:rounded-lg p-2 sm:p-3 md:p-4 border border-white/20 max-w-xs sm:max-w-sm relative">
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
          {/* Profile Icon - Smaller, more compact */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0">
            {profile?.profileIconId ? (
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/profileicon/${profile.profileIconId}.png`}
                alt="Profile Icon"
                className="w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 rounded-full"
              />
            ) : (
              <span className="text-white font-bold text-xs sm:text-sm md:text-base">
                {displayName?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Summoner Info - Smaller, more compact text */}
          <div className="min-w-0 flex-1">
            {/* Name - Smaller font sizes */}
            <h1 className="text-xs sm:text-sm md:text-base font-bold text-white truncate leading-tight">
              {displayName}
              {displayTag && <span className="text-gray-300 text-[10px] sm:text-xs md:text-sm">#{displayTag}</span>}
            </h1>
            
            {/* Info - Very compact */}
            <div className="text-gray-300 text-[10px] sm:text-xs md:text-sm leading-tight space-y-0.5">
              <div className="truncate">Lv {displayLevel}</div>
              {rankedInfo && rankedInfo.length > 0 ? (
                rankedInfo.slice(0, 1).map((rank, index) => (
                  <div key={rank.queueType || index} className="truncate">
                    <span className="hidden sm:inline text-[10px] sm:text-xs">{getQueueDisplay(rank.queueType)}: </span>
                    <span className="font-medium">
                      {rank.tier ? rank.tier.charAt(0).toUpperCase() + rank.tier.slice(1).toLowerCase() : 'Unranked'} {rank.rank}
                    </span>
                    <span className="hidden lg:inline text-gray-400"> ({rank.leaguePoints} LP)</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-400">Unranked</div>
              )}
            </div>
          </div>

          {/* Menu Dropdown Button */}
          {showMenuButton && (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="p-1 sm:p-1.5 hover:bg-white/10 rounded transition-colors"
                aria-label="Menu"
              >
                <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  
                  {/* Menu Items */}
                  <div className="absolute right-0 top-full mt-1 w-40 bg-black/90 backdrop-blur-md rounded-lg border border-white/20 shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onBackToMenu?.();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-white hover:bg-white/10 transition-colors"
                    >
                      <Home className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Back to Menu</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
