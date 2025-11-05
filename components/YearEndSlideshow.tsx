'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlayerInsights } from '@/lib/types';
import { ArrowLeft, ArrowRight, Share2, Download, Home } from 'lucide-react';

interface DetailedStats {
  totalGames: number;
  wins: number;
  queueTypes: { ranked: number; aram: number; other: number };
  roleDistribution: { [key: string]: number };
  championStats: Array<{
    championName: string;
    gamesPlayed: number;
    winRate: number;
    avgKDA: number;
    totalKills: number;
    totalDeaths: number;
    totalAssists: number;
  }>;
  monthlyPerformance: Array<{
    month: string;
    winRate: number;
    gamesPlayed: number;
  }>;
  averageStats: {
    avgDamage: number;
    avgGold: number;
  };
  streaks: {
    longestWinStreak: number;
    longestLossStreak: number;
    currentWinStreak: number;
    currentLossStreak: number;
  };
  bestGame: {
    gameId: string;
    champion: string;
    kda: string;
    damage: number;
    gold: number;
    win: boolean;
    date: string;
  } | null;
}

interface YearEndSlideshowProps {
  insights: PlayerInsights;
  onBack: () => void;
}

interface Slide {
  id: string;
  title: string;
  content: string;
  icon: string;
  bgGradient: string;
  textColor?: string;
}

export default function YearEndSlideshow({ insights, onBack }: YearEndSlideshowProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch detailed statistics
  useEffect(() => {
    const fetchDetailedStats = async () => {
      try {
        const [gameName, tagLine] = insights.playerId.split('#');
        const response = await fetch(`/api/detailed-stats?gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}`);
        const data = await response.json();
        
        if (response.ok) {
          setDetailedStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch detailed stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetailedStats();
  }, [insights.playerId]);

  // Generate slides based on insights and detailed stats
  const generateSlides = (): Slide[] => {
    if (!detailedStats) {
      // Fallback slides with basic insights data
      return [
        {
          id: 'loading',
          title: 'Preparing Your Year in Review',
          content: 'Analyzing your match history to create personalized insights...',
          icon: '⏳',
          bgGradient: 'from-blue-600 to-purple-600'
        }
      ];
    }

    const winRate = Math.round((detailedStats.wins / detailedStats.totalGames) * 100);
    const topChampion = detailedStats.championStats[0];
    const topRole = Object.entries(detailedStats.roleDistribution)
      .sort(([,a], [,b]) => b - a)[0];
    const bestMonth = detailedStats.monthlyPerformance[0];

    const slides: Slide[] = [
      {
        id: 'timeframe',
        title: 'Timeframe Detected',
        content: `We analyzed your entire 2025 League journey! Found ${detailedStats.totalGames} matches from January 1st through today.`,
        icon: '📊',
        bgGradient: 'from-blue-600 to-indigo-600'
      },
      {
        id: 'total-games',
        title: 'Total Games & Winrate',
        content: `You battled in ${detailedStats.totalGames} games — ${winRate}% wins. ${detailedStats.wins} victories earned through skill and determination!`,
        icon: '🏆',
        bgGradient: 'from-yellow-600 to-orange-600'
      },
      {
        id: 'queue-mix',
        title: 'Most-Played Queue Mix',
        content: `Ranked: ${Math.round((detailedStats.queueTypes.ranked / detailedStats.totalGames) * 100)}%, ARAM: ${Math.round((detailedStats.queueTypes.aram / detailedStats.totalGames) * 100)}%. You're a competitive spirit at heart!`,
        icon: '⚔️',
        bgGradient: 'from-red-600 to-pink-600'
      },
      {
        id: 'top-champions',
        title: 'Top Champions',
        content: `You one-tricked ${topChampion?.championName} — ${topChampion?.avgKDA.toFixed(1)} KDA, ${Math.round((topChampion?.winRate || 0) * 100)}% WR, ${topChampion?.gamesPlayed} games. True mastery!`,
        icon: '👑',
        bgGradient: 'from-purple-600 to-indigo-600'
      },
      {
        id: 'role-identity',
        title: 'Role/Position Identity',
        content: `Mostly ${topRole?.[0] || 'Flexible'} (${Math.round(((topRole?.[1] || 0) / detailedStats.totalGames) * 100)}%). Your best lane where you truly shine!`,
        icon: '🎯',
        bgGradient: 'from-blue-600 to-cyan-600'
      },
      {
        id: 'peak-performance',
        title: 'Peak Performance',
        content: `Your best month: ${bestMonth?.month} with ${Math.round((bestMonth?.winRate || 0) * 100)}% winrate across ${bestMonth?.gamesPlayed} games. Peak form achieved!`,
        icon: '📈',
        bgGradient: 'from-green-600 to-emerald-600'
      },
      {
        id: 'damage-impact',
        title: 'Damage Share',
        content: `Average damage per game: ${detailedStats.averageStats.avgDamage.toLocaleString()}. You consistently showed up when your team needed you most!`,
        icon: '💥',
        bgGradient: 'from-red-600 to-rose-600'
      },
      {
        id: 'streaks',
        title: 'Streaks',
        content: `Longest win streak: ${detailedStats.streaks.longestWinStreak}; longest grind: ${detailedStats.streaks.longestLossStreak} losses. The climb never stops!`,
        icon: '🔥',
        bgGradient: 'from-orange-600 to-red-600'
      },
      {
        id: 'best-game',
        title: 'Your Best Game',
        content: detailedStats.bestGame 
          ? `On ${detailedStats.bestGame.date}, ${detailedStats.bestGame.kda} KDA with ${detailedStats.bestGame.champion}. ${detailedStats.bestGame.damage.toLocaleString()} damage dealt!`
          : 'Every game was a learning experience that made you stronger!',
        icon: '🌟',
        bgGradient: 'from-yellow-500 to-amber-500'
      },
      {
        id: 'improvement',
        title: 'Growth Areas',
        content: `${insights.improvementAreas[0] || 'Keep focusing on consistency and map awareness'} — every pro has room to grow!`,
        icon: '📚',
        bgGradient: 'from-indigo-600 to-purple-600'
      },
      {
        id: 'fun-facts',
        title: 'Fun Facts',
        content: insights.yearEndSummary.funFacts.slice(0, 2).join(' • ') || 'You played with dedication and passion throughout the year!',
        icon: '🎉',
        bgGradient: 'from-pink-600 to-purple-600'
      },
      {
        id: 'wrap-up',
        title: 'Your 2025 Journey',
        content: `From ${detailedStats.totalGames} games to countless memories, you've grown as a player. Here's to an even better 2026! 🚀`,
        icon: '✨',
        bgGradient: 'from-purple-600 to-blue-600'
      }
    ];

    return slides;
  };

  const slides = generateSlides();

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Auto-play functionality
  useEffect(() => {
    if (isAutoPlaying) {
      const interval = setInterval(nextSlide, 4000);
      return () => clearInterval(interval);
    }
  }, [isAutoPlaying, nextSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          prevSlide();
          break;
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          nextSlide();
          break;
        case 'Escape':
          onBack();
          break;
        case 'p':
        case 'P':
          setIsAutoPlaying(!isAutoPlaying);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAutoPlaying, nextSlide, prevSlide, onBack]);

  const shareSlideshow = () => {
    const shareText = `Check out my League of Legends 2025 Year in Review! 🎮\n\n${slides.map(slide => `${slide.icon} ${slide.title}: ${slide.content}`).join('\n\n')}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'My League of Legends Year in Review',
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Year in review copied to clipboard!');
    }
  };

  const downloadSummary = () => {
    const summaryText = `${insights.playerId} - League of Legends 2025 Year in Review\n\n${slides.map(slide => `${slide.title}\n${slide.content}\n`).join('\n')}`;
    
    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${insights.playerId.replace('#', '-')}-year-review-2025.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentSlideData = slides[currentSlide];

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-8"></div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Preparing Your Year in Review
          </h2>
          <p className="text-blue-200">
            Analyzing your match history for detailed insights...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentSlideData.bgGradient} flex items-center justify-center transition-all duration-1000`}>
      <div className="max-w-5xl mx-auto px-4 text-center relative">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-center gap-1 mb-4">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-8 h-1 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'bg-white' : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
          <p className="text-white/80 text-sm">
            {currentSlide + 1} of {slides.length}
          </p>
        </div>

        {/* Slide Content */}
        <div className="bg-black/20 backdrop-blur-sm rounded-3xl p-12 mb-8 border border-white/20">
          <div className="text-8xl mb-8 animate-pulse">{currentSlideData.icon}</div>
          <h2 className="text-5xl font-bold text-white mb-8 leading-tight">
            {currentSlideData.title}
          </h2>
          <p className="text-2xl text-white/90 leading-relaxed max-w-3xl mx-auto">
            {currentSlideData.content}
          </p>
        </div>

        {/* Navigation Controls */}
        <div className="flex justify-center items-center gap-6 mb-8">
          <button
            onClick={prevSlide}
            className="p-3 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
            disabled={currentSlide === 0}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              isAutoPlaying 
                ? 'bg-white/30 text-white hover:bg-white/40' 
                : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            {isAutoPlaying ? 'Pause' : 'Auto Play'}
          </button>

          <button
            onClick={nextSlide}
            className="p-3 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
            disabled={currentSlide === slides.length - 1}
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        {/* Action Buttons */}
        {currentSlide === slides.length - 1 && (
          <div className="flex justify-center gap-4 animate-fade-in">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            >
              <Home className="w-5 h-5" />
              Back to Menu
            </button>
            <button
              onClick={shareSlideshow}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>
            <button
              onClick={downloadSummary}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              Download
            </button>
          </div>
        )}

        {/* Keyboard Navigation Hint */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <p className="text-white/60 text-sm">
            Use ← → arrow keys or click progress dots to navigate
          </p>
        </div>
      </div>
    </div>
  );
}