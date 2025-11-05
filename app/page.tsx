"use client";

import { useState, useEffect, useCallback } from "react";
import { PlayerInsights } from "@/lib/types";
import { Sparkles, Play } from "lucide-react";
import YearEndSlideshow from "@/components/YearEndSlideshow";
import RiotIdInput from "@/components/RiotIdInput";

type AppState = 'entry' | 'loading' | 'menu' | 'slideshow';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('entry');
  const [insights, setInsights] = useState<PlayerInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (appState === 'slideshow') {
        if (e.key === 'Escape') {
          setAppState('menu');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [appState]);

  const fetchInsights = useCallback(async (inputGameName: string, inputTagLine: string) => {
    setGameName(inputGameName);
    setTagLine(inputTagLine);
    setLoading(true);
    setError(null);
    setAppState('loading');
    
    try {
      const url = `/api/insights?gameName=${encodeURIComponent(
        inputGameName
      )}&tagLine=${encodeURIComponent(inputTagLine)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch insights");
      }

      setInsights(data);
      setAppState('menu');
    } catch (error: unknown) {
      console.error("Error fetching insights:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred while fetching insights"
      );
      setAppState('entry');
    } finally {
      setLoading(false);
    }
  }, []);

  // Entry Screen Component - Memoized to prevent re-renders
  const EntryScreen = useCallback(() => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <Sparkles className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-6xl font-bold text-white mb-4">
            See your 2025 League Year in Review
          </h1>
          <p className="text-xl text-blue-200 mb-8">
            Discover your journey through the Rift with personalized insights
          </p>
        </div>

        <RiotIdInput 
          onSubmit={fetchInsights}
          loading={loading}
          error={error}
        />

        <div className="text-white/60 text-sm">
          <p>✨ Powered by Riot Games API • 🔒 Your data stays private</p>
        </div>
      </div>
    </div>
  ), [loading, error, fetchInsights]);

  // Loading Screen Component
  const LoadingScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-8"></div>
        <h2 className="text-3xl font-bold text-white mb-4">
          Analyzing your entire 2025 League journey...
        </h2>
        <p className="text-blue-200 mb-8">
          Fetching ALL your 2025 matches for the complete year-end review
        </p>
        <p className="text-blue-300 text-sm mb-8">
          This may take a moment for players with many games 🎮
        </p>
        <div className="bg-white/10 rounded-full h-2 w-64 mx-auto">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full animate-pulse w-3/4"></div>
        </div>
      </div>
    </div>
  );

  // Menu Screen Component
  const MenuScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Welcome back, {gameName}#{tagLine}!
          </h1>
          <p className="text-xl text-blue-200">
            Your 2025 League journey is ready to explore
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Quick Stats Preview */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Games</span>
                <span className="text-white font-bold text-xl">{insights?.totalGames}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Win Rate</span>
                <span className="text-white font-bold text-xl">{Math.round((insights?.winRate || 0) * 100)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Main Role</span>
                <span className="text-white font-bold text-xl">{insights?.yearEndSummary.favoriteRole}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Top Champion</span>
                <span className="text-white font-bold text-xl">{insights?.favoriteChampions[0]?.championName}</span>
              </div>
            </div>
          </div>

          {/* Year-End Recap Option */}
          <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
            <div className="text-center">
              <Sparkles className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-4">Year-End Recap</h2>
              <p className="text-gray-300 mb-6">
                Experience your League journey through an interactive slideshow with personalized insights, achievements, and memorable moments.
              </p>
              <button
                onClick={() => setAppState('slideshow')}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-semibold flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Year-End Recap
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={() => {
              setAppState('entry');
              setInsights(null);
              setGameName('');
              setTagLine('');
            }}
            className="text-blue-300 hover:text-white transition-colors"
          >
            ← Try a different summoner
          </button>
        </div>
      </div>
    </div>
  );

  // Slideshow Component
  const SlideshowScreen = () => {
    if (!insights) return null;

    return (
      <YearEndSlideshow 
        insights={insights} 
        onBack={() => setAppState('menu')} 
      />
    );
  };

  // Main render logic
  return (
    <>
      {appState === 'entry' && <EntryScreen key="entry" />}
      {appState === 'loading' && <LoadingScreen key="loading" />}
      {appState === 'menu' && <MenuScreen key="menu" />}
      {appState === 'slideshow' && <SlideshowScreen key="slideshow" />}
    </>
  );
}
