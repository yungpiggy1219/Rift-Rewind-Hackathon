import { NextRequest, NextResponse } from 'next/server';
import { riotAPI } from '@/lib/riot-api';
import { MatchAnalyzer } from '@/lib/match-analyzer';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameName = searchParams.get('gameName');
    const tagLine = searchParams.get('tagLine');
    
    if (!gameName || !tagLine) {
      return NextResponse.json({ error: 'Game name and tag line are required' }, { status: 400 });
    }

    if (!process.env.RIOT_API_KEY) {
      return NextResponse.json({ 
        error: 'Riot API key is not configured' 
      }, { status: 500 });
    }

    // Fetch ALL 2025 matches for comprehensive year-end analysis
    const matchData = await riotAPI.get2025Matches(gameName, tagLine);
    
    if (matchData.length === 0) {
      return NextResponse.json({ 
        error: 'No recent matches found for this summoner' 
      }, { status: 404 });
    }

    const playerName = `${gameName}#${tagLine}`;
    
    // Generate detailed statistics
    const detailedStats = {
      // Basic stats
      totalGames: matchData.length,
      wins: matchData.filter(match => {
        const player = match.participants.find(p => p.summonerName === playerName);
        return player?.win;
      }).length,
      
      // Queue distribution
      queueTypes: {
        ranked: matchData.filter(match => match.gameMode === 'CLASSIC').length,
        aram: matchData.filter(match => match.gameMode === 'ARAM').length,
        other: matchData.filter(match => !['CLASSIC', 'ARAM'].includes(match.gameMode)).length
      },
      
      // Role analysis
      roleDistribution: (() => {
        const roles: { [key: string]: number } = {};
        matchData.forEach(match => {
          const player = match.participants.find(p => p.summonerName === playerName);
          if (player?.role) {
            roles[player.role] = (roles[player.role] || 0) + 1;
          }
        });
        return roles;
      })(),
      
      // Champion mastery
      championStats: (() => {
        const champions: { [key: string]: { games: number; wins: number; kills: number; deaths: number; assists: number } } = {};
        
        matchData.forEach(match => {
          const player = match.participants.find(p => p.summonerName === playerName);
          if (player) {
            const champ = player.championName;
            if (!champions[champ]) {
              champions[champ] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
            }
            champions[champ].games++;
            if (player.win) champions[champ].wins++;
            champions[champ].kills += player.kills;
            champions[champ].deaths += player.deaths;
            champions[champ].assists += player.assists;
          }
        });
        
        return Object.entries(champions)
          .map(([name, stats]) => ({
            championName: name,
            gamesPlayed: stats.games,
            winRate: stats.wins / stats.games,
            avgKDA: stats.deaths > 0 ? (stats.kills + stats.assists) / stats.deaths : stats.kills + stats.assists,
            totalKills: stats.kills,
            totalDeaths: stats.deaths,
            totalAssists: stats.assists
          }))
          .sort((a, b) => b.gamesPlayed - a.gamesPlayed);
      })(),
      
      // Performance trends by month
      monthlyPerformance: (() => {
        const months: { [key: string]: { games: number; wins: number } } = {};
        
        matchData.forEach(match => {
          const date = new Date(match.gameCreation);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!months[monthKey]) {
            months[monthKey] = { games: 0, wins: 0 };
          }
          
          months[monthKey].games++;
          const player = match.participants.find(p => p.summonerName === playerName);
          if (player?.win) {
            months[monthKey].wins++;
          }
        });
        
        return Object.entries(months)
          .map(([month, stats]) => ({
            month,
            winRate: stats.wins / stats.games,
            gamesPlayed: stats.games
          }))
          .sort((a, b) => b.winRate - a.winRate);
      })(),
      
      // Damage and gold analysis
      averageStats: (() => {
        let totalDamage = 0;
        let totalGold = 0;
        let validGames = 0;
        
        matchData.forEach(match => {
          const player = match.participants.find(p => p.summonerName === playerName);
          if (player) {
            totalDamage += player.totalDamageDealt;
            totalGold += player.goldEarned;
            validGames++;
          }
        });
        
        return {
          avgDamage: validGames > 0 ? Math.round(totalDamage / validGames) : 0,
          avgGold: validGames > 0 ? Math.round(totalGold / validGames) : 0
        };
      })(),
      
      // Streaks analysis
      streaks: (() => {
        let currentWinStreak = 0;
        let currentLossStreak = 0;
        let maxWinStreak = 0;
        let maxLossStreak = 0;
        
        // Sort matches by date (most recent first)
        const sortedMatches = [...matchData].sort((a, b) => b.gameCreation - a.gameCreation);
        
        sortedMatches.forEach(match => {
          const player = match.participants.find(p => p.summonerName === playerName);
          if (player?.win) {
            currentWinStreak++;
            currentLossStreak = 0;
            maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
          } else {
            currentLossStreak++;
            currentWinStreak = 0;
            maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
          }
        });
        
        return {
          longestWinStreak: maxWinStreak,
          longestLossStreak: maxLossStreak,
          currentWinStreak,
          currentLossStreak
        };
      })(),
      
      // Best game analysis
      bestGame: (() => {
        let bestGame = null;
        let bestScore = 0;
        
        matchData.forEach(match => {
          const player = match.participants.find(p => p.summonerName === playerName);
          if (player) {
            // Calculate a "performance score" based on KDA, damage, and win
            const kda = player.deaths > 0 ? (player.kills + player.assists) / player.deaths : player.kills + player.assists;
            const score = kda * (player.win ? 1.5 : 1) + (player.totalDamageDealt / 1000);
            
            if (score > bestScore) {
              bestScore = score;
              bestGame = {
                gameId: match.gameId,
                champion: player.championName,
                kda: `${player.kills}/${player.deaths}/${player.assists}`,
                damage: player.totalDamageDealt,
                gold: player.goldEarned,
                win: player.win,
                date: new Date(match.gameCreation).toLocaleDateString()
              };
            }
          }
        });
        
        return bestGame;
      })()
    };

    return NextResponse.json(detailedStats);
  } catch (error: any) {
    console.error('Error fetching detailed stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch detailed statistics' },
      { status: 500 }
    );
  }
}