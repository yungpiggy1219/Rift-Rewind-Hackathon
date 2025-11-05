"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const handleSubmit = async (inputGameName: string, inputTagLine: string) => {
    setGameName(inputGameName);
    setTagLine(inputTagLine);
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/summoner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameName: inputGameName, 
          tagLine: inputTagLine 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resolve summoner");
      }

      // Redirect to recap page with default agent
      router.push(`/recap/${data.puuid}?agent=velkoz&season=2025&name=${encodeURIComponent(inputGameName)}&tag=${encodeURIComponent(inputTagLine)}`);
    } catch (error: unknown) {
      console.error("Error resolving summoner:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred while resolving summoner"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <Sparkles className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-6xl font-bold text-white mb-4">
            Rift Rewind 2025
          </h1>
          <p className="text-xl text-blue-200 mb-8">
            Your League of Legends year in review with AI-powered insights
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (gameName && tagLine) {
              handleSubmit(gameName, tagLine);
            }
          }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Game Name"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Tag Line"
                value={tagLine}
                onChange={(e) => setTagLine(e.target.value)}
                className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading || !gameName || !tagLine}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 font-semibold transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Start Your Recap
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-white/60 text-sm space-y-2">
          <p>✨ Powered by Riot Games API • 🔒 Your data stays private</p>
          <p>🎭 Choose from 5 AI narrators • 📊 10 unique insight scenes</p>
        </div>
      </div>
    </div>
  );
}
