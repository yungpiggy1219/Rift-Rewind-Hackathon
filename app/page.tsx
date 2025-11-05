"use client";

import { useState } from "react";
import { PlayerInsights } from "@/lib/types";
import { TrendingUp, Trophy, Target, Users } from "lucide-react";
import YearEndSummary from "@/components/YearEndSummary";

export default function Home() {
  const [insights, setInsights] = useState<PlayerInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    if (!gameName.trim() || !tagLine.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const url = `/api/insights?gameName=${encodeURIComponent(
        gameName
      )}&tagLine=${encodeURIComponent(tagLine)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch insights");
      }

      if (data.debug) {
        // Debug mode - display raw data
        console.log("Debug data:", data.debugInfo);
        setError(
          `DEBUG MODE: Found ${
            data.debugInfo.matchCount
          } matches. First match participants: ${data.debugInfo.allParticipantNames.join(
            ", "
          )}`
        );
        setInsights(null);
      } else {
        setInsights(data);
      }
    } catch (error: unknown) {
      console.error("Error fetching insights:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred while fetching insights"
      );
      setInsights(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Rift Rewind</h1>
          <p className="text-xl text-blue-200 mb-8">
            AI-Powered League of Legends Insights
          </p>

          {/* Search */}
          <div className="max-w-lg mx-auto">
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Game Name (e.g., Faker)"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === "Enter" && fetchInsights()}
              />
              <div className="flex items-center text-white font-bold text-xl">
                #
              </div>
              <input
                type="text"
                placeholder="Tag (e.g., KR1)"
                value={tagLine}
                onChange={(e) => setTagLine(e.target.value)}
                className="w-24 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === "Enter" && fetchInsights()}
              />
              <button
                onClick={fetchInsights}
                disabled={loading || !gameName.trim() || !tagLine.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Analyze"}
              </button>
            </div>
            <p className="text-blue-200 text-sm">
              Enter your Riot ID (Game Name + Tag Line)
            </p>
          </div>
        </div>

        {/* Data Source Indicator */}
        {insights && (
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              Live data from Riot API ({insights.matchCount || 0} matches
              analyzed)
            </div>
          </div>
        )}

        {/* Results */}
        {insights && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Stats Cards */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="text-yellow-400" size={24} />
                <h3 className="text-lg font-semibold">Win Rate</h3>
              </div>
              <p className="text-3xl font-bold">
                {Math.round(insights.winRate * 100)}%
              </p>
              <p className="text-sm text-gray-300">
                {insights.totalGames} games played
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="text-green-400" size={24} />
                <h3 className="text-lg font-semibold">Best Month</h3>
              </div>
              <p className="text-2xl font-bold">
                {insights.yearEndSummary.bestMonth}
              </p>
              <p className="text-sm text-gray-300">Peak performance</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Target className="text-red-400" size={24} />
                <h3 className="text-lg font-semibold">Main Role</h3>
              </div>
              <p className="text-2xl font-bold">
                {insights.yearEndSummary.favoriteRole}
              </p>
              <p className="text-sm text-gray-300">Most played</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Users className="text-purple-400" size={24} />
                <h3 className="text-lg font-semibold">Champions</h3>
              </div>
              <p className="text-2xl font-bold">
                {insights.favoriteChampions.length}
              </p>
              <p className="text-sm text-gray-300">In rotation</p>
            </div>
          </div>
        )}

        {insights && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Favorite Champions */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                Favorite Champions
              </h2>
              <div className="space-y-3">
                {insights.favoriteChampions.map((champ, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center bg-white/5 rounded-lg p-3"
                  >
                    <div>
                      <p className="text-white font-semibold">
                        {champ.championName}
                      </p>
                      <p className="text-gray-300 text-sm">
                        {champ.gamesPlayed} games
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">
                        {Math.round(champ.winRate * 100)}%
                      </p>
                      <p className="text-gray-300 text-sm">
                        {champ.avgKDA.toFixed(1)} KDA
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                Your Strengths
              </h2>
              <div className="space-y-2 mb-6">
                {insights.strengths.map((strength, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-200">{strength}</p>
                  </div>
                ))}
              </div>

              <h3 className="text-xl font-bold text-white mb-4">
                Areas to Improve
              </h3>
              <div className="space-y-2">
                {insights.improvementAreas.map((area, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-200">{area}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Fun Facts */}
        {insights && (
          <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">🎉 Fun Facts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.yearEndSummary.funFacts.map((fact, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-200">{fact}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Year-End Summary */}
        {insights && (
          <div className="mt-8">
            <YearEndSummary playerId={`${gameName}#${tagLine}`} />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="max-w-md mx-auto mt-8 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-200 text-center">{error}</p>
          </div>
        )}

        {/* Setup Instructions */}
        {!insights && !loading && !error && (
          <div className="text-center text-white/70 mt-12">
            <p className="text-lg mb-6">
              Ready to analyze your League performance!
            </p>
            <div className="max-w-2xl mx-auto space-y-4 text-sm">
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">
                  ✅ API Connected
                </h3>
                <p>
                  Riot API is configured and ready to fetch your match data from
                  all regions.
                </p>
                <p className="text-xs mt-1 text-green-300">
                  Multi-region search enabled (Americas, Europe, Asia, SEA)
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">🎮 How to Use</h3>
                <p>
                  Enter your Riot ID (Game Name + Tag) to get detailed insights
                </p>
                <p className="text-xs mt-1">
                  Example: YourName#NA1 or YourName#EUW
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">
                  🤖 Optional: AI Features
                </h3>
                <p>Add AWS credentials for personalized coaching insights</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
