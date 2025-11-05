'use client';

import { useState, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';

interface RiotIdInputProps {
  onSubmit: (gameName: string, tagLine: string) => void;
  loading: boolean;
  error: string | null;
}

export default function RiotIdInput({ onSubmit, loading, error }: RiotIdInputProps) {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");

  const handleSubmit = useCallback(() => {
    if (gameName.trim() && tagLine.trim()) {
      onSubmit(gameName.trim(), tagLine.trim());
    }
  }, [gameName, tagLine, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
      <h2 className="text-2xl font-bold text-white mb-6">Enter your Riot ID</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Game Name (e.g., Faker)"
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
          className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg text-black"
          onKeyDown={handleKeyDown}
          autoComplete="off"
          disabled={loading}
        />
        <div className="flex items-center text-white font-bold text-2xl px-2">
          #
        </div>
        <input
          type="text"
          placeholder="Tag (e.g., KR1)"
          value={tagLine}
          onChange={(e) => setTagLine(e.target.value)}
          className="w-32 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg text-black"
          onKeyDown={handleKeyDown}
          autoComplete="off"
          disabled={loading}
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading || !gameName.trim() || !tagLine.trim()}
        className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-lg font-semibold flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? "Analyzing..." : "Start My Year in Review"}
        <ArrowRight className="w-5 h-5" />
      </button>
      <p className="text-blue-200 text-sm mt-4">
        We&apos;ll analyze ALL your 2025 games to create your complete year-end recap
      </p>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mt-4">
          <p className="text-red-200">{error}</p>
        </div>
      )}
    </div>
  );
}