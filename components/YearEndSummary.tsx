'use client';

import { useState } from 'react';
import { Share2, Download, Sparkles } from 'lucide-react';

interface YearEndSummaryProps {
  playerId: string;
}

export default function YearEndSummary({ playerId }: YearEndSummaryProps) {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/year-summary?playerId=${encodeURIComponent(playerId)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summary');
      }
      
      setSummary(data.summary);
    } catch (error: unknown) {
      console.error('Error generating summary:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const shareSummary = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My League of Legends Year in Review',
        text: summary,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(summary);
      alert('Summary copied to clipboard!');
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="text-yellow-400" size={24} />
          Year-End Summary
        </h2>
        <button
          onClick={generateSummary}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate AI Summary'}
        </button>
      </div>

      {summary && (
        <div className="space-y-4">
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-gray-200 whitespace-pre-line">{summary}</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={shareSummary}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Share2 size={16} />
              Share
            </button>
            <button
              onClick={() => {
                const blob = new Blob([summary], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${playerId}-year-summary.txt`;
                a.click();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download size={16} />
              Download
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {!summary && !loading && !error && (
        <p className="text-gray-300">
          Generate an AI-powered year-end summary of your League of Legends journey!
        </p>
      )}
    </div>
  );
}