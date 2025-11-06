'use client';

import React from 'react';
import { MatchData } from '@/src/lib/types';

const summonerSpellMap: Record<number, string> = {
  21: "SummonerBarrier",
  1:  "SummonerBoost",
  2202: "SummonerCherryFlash",
  2201: "SummonerCherryHold",
  14: "SummonerDot",
  3:  "SummonerExhaust",
  4:  "SummonerFlash",
  6:  "SummonerHaste",
  7:  "SummonerHeal",
  13: "SummonerMana",
  30: "SummonerPoroRecall",
  31: "SummonerPoroThrow",
  11: "SummonerSmite",
  39: "SummonerSnowURFSnowball_Mark",
  32: "SummonerSnowball",
  12: "SummonerTeleport",
  54: "Summoner_UltBookPlaceholder",
  55: "Summoner_UltBookSmitePlaceholder"
};

interface MatchCardProps {
  match: MatchData;
  playerPuuid: string;
}

export default function MatchCard({ match, playerPuuid }: MatchCardProps) {
  // Find the player's data
  const player = match.participants.find(p => p.puuid === playerPuuid);
  
  if (!player) {
    return <div className="text-red-400">Player not found in match</div>;
  }

  // Calculate KDA
  const kda = player.deaths === 0 
    ? (player.kills + player.assists).toFixed(2)
    : ((player.kills + player.assists) / player.deaths).toFixed(2);

  // Calculate CS per minute
  const durationMinutes = match.gameDuration / 60;
  const csPerMin = (241 / durationMinutes).toFixed(1); // Using placeholder CS value

  // Format game duration
  const minutes = Math.floor(match.gameDuration / 60);
  const seconds = Math.floor(match.gameDuration % 60);
  const durationStr = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;

  // Format time ago
  const timeAgo = formatTimeAgo(match.gameCreation);

  // Get team participants (split into two teams)
  const team1 = match.participants.slice(0, 5);
  const team2 = match.participants.slice(5, 10);
  const playerTeam = team1.some(p => p.puuid === playerPuuid) ? team1 : team2;

  // Debug summoner spells
  console.log('[MatchCard] Summoner Spell 1 ID:', player.summoner1Id);
  console.log('[MatchCard] Summoner Spell 1 Map:', summonerSpellMap[player.summoner1Id]);
  console.log('[MatchCard] Summoner Spell 2 ID:', player.summoner2Id);
  console.log('[MatchCard] Summoner Spell 2 Map:', summonerSpellMap[player.summoner2Id]);

  return (
    <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-xl p-4 border border-white/20 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        {/* Left Section - Game Info */}
        <div className="flex items-center gap-4">
          {/* Champion Icon & Level */}
          <div className="flex items-center gap-1">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/30">
                <img 
                  src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/champion/${player.championName}.png`}
                  alt={player.championName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to gradient if image fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center"><span class="text-white font-bold text-xl">${player.championName.substring(0, 2).toUpperCase()}</span></div>`;
                  }}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-gray-900 border-2 border-white/30 rounded-full w-6 h-6 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{player.champLevel}</span>
              </div>
            </div>
            
            {/* Summoner Spells */}
            <div className="flex flex-col gap-1">
              <div className="w-7 h-7 rounded overflow-hidden border border-gray-600">
                <img 
                  src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/spell/${summonerSpellMap[player.summoner1Id]}.png`}
                  alt="Spell 1"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-7 h-7 rounded overflow-hidden border border-gray-600">
                <img 
                  src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/spell/${summonerSpellMap[player.summoner2Id]}.png`}
                  alt="Spell 2"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Game Mode & Time */}
          <div className="text-left">
            <div className="text-white font-semibold">{match.gameMode}</div>
            <div className="text-gray-400 text-sm">{timeAgo}</div>
          </div>

          {/* KDA */}
          <div className="text-center ml-4">
            <div className="text-white font-bold text-lg">
              {player.kills} / <span className="text-red-400">{player.deaths}</span> / {player.assists}
            </div>
            <div className="text-gray-400 text-sm">{kda}:1 KDA</div>
          </div>
        </div>

        {/* Middle Section - Champion & Stats */}
        <div className="flex items-center gap-6">
          {/* Lane/Role & Rank */}
          <div className="text-center">
            <div className="text-yellow-400 font-semibold">{player.championName}</div>
            <div className="text-gray-400 text-xs">
              🔥 P/Kill {Math.round((player.kills / (team1.reduce((sum, p) => sum + p.kills, 0) || 1)) * 100)}%
            </div>
            <div className="text-gray-400 text-xs">CS {csPerMin} ({durationMinutes.toFixed(0)})</div>
            <div className="text-gray-400 text-xs flex items-center gap-1 justify-center">
              <span>🏆</span> Challenger
            </div>
          </div>

          {/* Items */}
          <div className="flex gap-1">
            {player.items.map((itemId, index) => (
              <div
                key={index}
                className="w-8 h-8 bg-gray-800 rounded border border-gray-600 overflow-hidden"
              >
                {itemId > 0 ? (
                  <img 
                    src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/item/${itemId}.png`}
                    alt={`Item ${itemId}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-900"></div>
                )}
              </div>
            ))}
          </div>

          {/* Badges - TODO*/}
{/*           <div className="flex flex-col gap-1">
            <div className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              Double Kill
            </div>
            <div className="bg-gray-700 text-white text-xs font-bold px-3 py-1 rounded-full">
              5th
            </div>
            <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              Victor
            </div>
          </div> */}
        </div>

        {/* Right Section - Team Composition */}
        <div className="flex gap-4">
          {/* Player's Team */}
          <div className="flex flex-col gap-1">
            {playerTeam.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-white/30">
                  <img 
                    src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/champion/${p.championName}.png`}
                    alt={p.championName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className={`text-xs ${p.puuid === playerPuuid ? 'text-white font-bold' : 'text-gray-400'}`}>
                  {p.summonerName.length > 10 ? p.summonerName.substring(0, 10) + '...' : p.summonerName}
                </span>
              </div>
            ))}
          </div>

          {/* Enemy Team */}
          <div className="flex flex-col gap-1">
            {(playerTeam === team1 ? team2 : team1).map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-white/30">
                  <img 
                    src={`https://ddragon.leagueoflegends.com/cdn/15.22.1/img/champion/${p.championName}.png`}
                    alt={p.championName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xs text-gray-400">
                  {p.summonerName.length > 10 ? p.summonerName.substring(0, 10) + '...' : p.summonerName}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom - Win/Loss & Duration */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
        <div className={`font-bold text-lg ${player.win ? 'text-green-400' : 'text-red-400'}`}>
          {player.win ? 'Victory' : 'Defeat'}
        </div>
        <div className="text-gray-400 text-sm">{durationStr}</div>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else if (diffDays < 30) {
    return `${diffDays} days ago`;
  } else {
    return new Date(timestamp).toLocaleDateString();
  }
}
